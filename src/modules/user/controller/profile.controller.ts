import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ProfileService } from '../services/profile.service';
import {
  ApiBody,
  ApiConsumes,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UserContext } from '@common/decorators/user-context.decorator';
import { JwtPayload } from '@modules/authentication/types';
import { ChangeAvatarDto } from '@modules/user/dto/change-avatar.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { fileFilter, ALLOWED_IMAGE_MIME_TYPES } from '@utils/file-filter';
import { ValidationErrorMessages } from '@common/enums/validation-error-messages.enum';
import { UploadedAvatarDto } from '@modules/user/dto/uploaded-avatar.dto';

@ApiTags('User Profile')
@Controller('users/profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get('avatars')
  @ApiOperation({ summary: 'Get default profile images' })
  @ApiOkResponse({
    description: 'Returns a list of default profile images',
    type: [String],
  })
  async getDefaultProfileImages(): Promise<{ images: string[] }> {
    const result = await this.profileService.getDefaultProfileImages();
    return {
      images: result,
    };
  }

  @Get('avatars/uploaded')
  @ApiOperation({ summary: 'Get uploaded profile images' })
  @ApiOkResponse({
    description: 'Returns a list of uploaded profile images',
    type: UploadedAvatarDto,
  })
  async getUserUploadedAvatars(
    @UserContext() { sub }: JwtPayload,
  ): Promise<UploadedAvatarDto | null> {
    const result = await this.profileService.getUserUploadedAvatar(sub);

    if (!result) {
      return null;
    }

    return UploadedAvatarDto.from(result);
  }

  @Put('avatars')
  @ApiOperation({ summary: 'Change avatar' })
  @ApiOkResponse({
    description: 'Changes the avatar of the user',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ type: ChangeAvatarDto })
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: fileFilter(ALLOWED_IMAGE_MIME_TYPES),
      limits: { fileSize: 1024 * 1024 * 3 },
    }),
  )
  async changeProfileImage(
    @UserContext() { sub }: JwtPayload,
    @Body() body: ChangeAvatarDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<void> {
    if (!file && !body.url) {
      throw new BadRequestException(ValidationErrorMessages.INPUT_IS_REQUIRED);
    }
    await this.profileService.changeProfileImage(sub, body.url || file!);
  }

  // @Put('avatars/upload-url')
  // @ApiOperation({ summary: 'Get presigned url for avatar upload' })
  // @ApiOkResponse({
  //   description: 'Returns a presigned url for avatar upload',
  // })
  // @ApiBody({ type: GeneratePresignedUrlDto })
  // async getUploadPresignedUrl(
  //   @UserContext() { sub }: JwtPayload,
  //   @Body() body: GeneratePresignedUrlDto,
  // ): Promise<{ fileId: string; url: string }> {
  //   return await this.profileService.getUploadPresignedUrl(sub, body);
  // }
}
