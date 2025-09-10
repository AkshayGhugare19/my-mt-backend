import { UserContext } from '@common/decorators/user-context.decorator';
import {
  allOf,
  anyOf,
  RequirePermissions,
} from '@modules/permission/decorator/require-permissions.decorator';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ParametersService } from './parameters.service';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import { UserService } from '@modules/user/services/user.service';
import { Parameters } from './types';
import { UpdateParametersDto } from './dtos/update-parameter.dto';

@ApiTags('Parameters')
@Controller('parameters')
export class ParametersController {
  constructor(
    private readonly parameterService: ParametersService,
    private readonly userService: UserService,
  ) {}

  @Get()
  @RequirePermissions('admin', anyOf(Permissions.READ_PARAMETERS))
  async getWalletAddresses(
    @UserContext('sub') userId: string,
  ): Promise<Parameters> {
    return await this.parameterService.getAllParameters(userId);
  }

  @Patch('/update')
  @RequirePermissions('admin', allOf(Permissions.EDIT_PARAMETERS))
  async updateTronWithdrawalWallet(
    @UserContext('sub') userId: string,
    @Body() updateData: UpdateParametersDto,
  ): Promise<void> {
    const verificationResult =
      await this.userService.verifyTwoFactorAuthentication(
        userId,
        updateData.twoFactorAuthenticationCode,
      );
    if (!verificationResult) {
      throw new BadRequestException(
        ErrorMessages.INVALID_TWO_FACTOR_AUTHENTICATION_CODE,
      );
    }
    this.parameterService.updateParameters(updateData);
  }
}
