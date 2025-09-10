import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import {
  encryptPassword,
  verifyPassword,
} from '@common/helper/encoding/password';
import { hmacSha512Inb64Url } from '@utils/hmac-sha512-in-b64-url';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';
import { MailingProducer } from '@infrastructure/mail/mailing.producer';
import { UserCodeService } from '@modules/user/services/user-code.service';
import { ChangePasswordDto } from '@modules/user/dto/change-password.dto';
import { NotFoundError } from '@common/error/not-found.error';
import { CodeTypes } from '@modules/user/enum/code-type.enum';
import { ResetPasswordDto } from '@modules/user/dto/reset-password.dto';
import { ForgotPasswordDto } from '@modules/user/dto/forgot-password.dto';
import { Role, Roles } from '@modules/role/enum/role.enum';
import { PermissionService } from '@modules/permission/service/permission.service';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { generateSimplePassword } from '@utils/generate-simple-password';

@Injectable()
export class UserPasswordService {
  constructor(
    private readonly userService: UserService,
    private readonly userCodeService: UserCodeService,
    private readonly mailingProducer: MailingProducer,
    private readonly configService: ConfigService,
    private readonly permissionService: PermissionService,
  ) {}

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<void> {
    const findPasswordResult = await this.userService.findByIdFull(userId);

    if (
      !findPasswordResult ||
      !findPasswordResult.password ||
      !verifyPassword(
        changePasswordDto?.oldPassword,
        findPasswordResult.password,
      )
    ) {
      throw new BadRequestException(ErrorMessages.BAD_CREDENTIALS);
    }

    try {
      await this.userService.updateById(userId, {
        password: encryptPassword(changePasswordDto.password),
        resetPasswordRequired: false,
      });
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async regeneratePassword(
    requesterId: string,
    userId: string,
  ): Promise<string> {
    const permission =
      await this.permissionService.getUserPermissions(requesterId);

    const user = await this.userService.findById(userId);

    if (!user) {
      throw new NotFoundError(ErrorMessages.NOT_FOUND, 'User', userId);
    }
    if (
      !permission.includes(Permissions.EDIT_PASSWORD) &&
      user.masterId !== requesterId
    ) {
      throw new ForbiddenException();
    }
    const password = generateSimplePassword();

    try {
      await this.userService.updateById(userId, {
        password: encryptPassword(password),
        resetPasswordRequired: true,
      });
      return password;
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    // Check if user with that email exists
    const user = await this.userService.findByEmail(forgotPasswordDto.email);

    if (!user || ![Roles.USER, Roles.VIP_USER].includes(user.roles[0].name as 'USER' | 'VIP')) {
      throw new NotFoundError(
        ErrorMessages.NOT_FOUND,
        'User',
        forgotPasswordDto.email,
      );
    }

    // Generate forgot password code
    const code = this.userCodeService.getForgotPasswordCode();

    // Upsert forgot password code
    const userCode = await this.userCodeService.upsert({
      userId: user.id,
      code: code.code,
      codeType: CodeTypes.FORGOT_PASSWORD,
      expiresAt: code.expiryDate,
    });

    if (!userCode) {
      throw new Error('Error while generating forgot password code');
    }

    // Send forgot password email
    await this.mailingProducer.enqueueSendForgotPasswordMailJob({
      userEmail: forgotPasswordDto.email,
      code: userCode.code,
      userRole: user.roles.at(0)?.name as Role,
    });
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<string | undefined> {
    const userCode = await this.userCodeService.findByCodeAndCodeType(
      resetPasswordDto.code,
      CodeTypes.FORGOT_PASSWORD,
    );

    if (!userCode || !userCode.user.email) {
      throw new BadRequestException(ErrorMessages.INVALID_OR_EXPIRED_CODE);
    }

    const hashKey = this.configService.getOrThrow<string>(ENV.MAILING_HASH_KEY);
    if (
      new Date() > userCode.expiresAt ||
      resetPasswordDto.code !== userCode.code ||
      hmacSha512Inb64Url(hashKey, userCode.user.email!) !==
        resetPasswordDto.email
    ) {
      throw new BadRequestException(ErrorMessages.INVALID_OR_EXPIRED_CODE);
    }

    // Update password with new one
    await this.userService.updateById(userCode.userId, {
      password: encryptPassword(resetPasswordDto.password),
      resetPasswordRequired: false,
    });

    // Delete forgot password code
    await this.userCodeService.deleteById(userCode.id);

    return undefined;
  }
}
