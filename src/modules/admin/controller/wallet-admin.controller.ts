import { UserContext } from '@common/decorators/user-context.decorator';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import {
  ETHEREUM_DEPOSIT_PUBLIC_KEY_SECRET,
  ETHEREUM_WITHDRAWAL_PRIVATE_KEY_SECRET,
  ETHEREUM_WITHDRAWAL_PUBLIC_KEY_SECRET,
  SOLANA_DEPOSIT_PUBLIC_KEY_SECRET,
  SOLANA_FEES_PRIVATE_KEY_SECRET,
  SOLANA_FEES_PUBLIC_KEY_SECRET,
  SOLANA_WITHDRAWAL_PRIVATE_KEY_SECRET,
  SOLANA_WITHDRAWAL_PUBLIC_KEY_SECRET,
  TRON_DEPOSIT_PUBLIC_KEY_SECRET,
  TRON_FEES_PRIVATE_KEY_SECRET,
  TRON_FEES_PUBLIC_KEY_SECRET,
  TRON_WITHDRAW_PRIVATE_KEY_SECRET,
  TRON_WITHDRAW_PUBLIC_KEY_SECRET,
} from '@infrastructure/secrets/config';
import { SecretsService } from '@infrastructure/secrets/secrets.service';
import { UpdateTronDepositWalletDto } from '@modules/admin/dtos/update-tron-deposit-wallet.dto';
import { UpdateSettlementWalletDto } from '@modules/admin/dtos/update-settlement-wallet.dto';
import {
  UpdateTronFeesWalletDto,
  UpdateTronWithdrawWalletDto,
} from '@modules/admin/dtos/update-tron-withdraw-wallet.dto';
import { WalletsDto } from '@modules/admin/dtos/wallets.dto';
import { AdminService } from '@modules/admin/service/admin.service';
import {
  RequirePermissions,
  allOf,
  anyOf,
} from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';
import { PermissionService } from '@modules/permission/service/permission.service';
import { UserService } from '@modules/user/services/user.service';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UpdateSolanaDepositWalletDto } from '../dtos/update-solana-deposit-wallet.dto';
import { UpdateEthereumDepositWalletDto } from '../dtos/update-ethereum-deposit-wallet.dto';
import {
  UpdateSolanaFeesWalletDto,
  UpdateSolanaWithdrawWalletDto,
} from '../dtos/update-solana-withdraw-wallet.dto';
import { UpdateEthereumWithdrawWalletDto } from '../dtos/update-ethereum-withdraw-wallet.dto';

@ApiTags('Admin Wallet')
@Controller('admin/wallets')
export class WalletAdminController {
  constructor(
    private readonly permissionService: PermissionService,
    private readonly adminService: AdminService,
    private readonly userService: UserService,
    private readonly secretsService: SecretsService,
  ) {}

  @Get()
  @RequirePermissions(
    'admin',
    anyOf(
      Permissions.READ_SETTLEMENT_WALLET,
      Permissions.READ_WITHDRAWAL_WALLET,
      Permissions.READ_DEPOSIT_WALLET,
      Permissions.READ_OWN_WALLET,
    ),
  )
  async getWalletAddresses(
    @UserContext('sub') userId: string,
  ): Promise<WalletsDto> {
    return await this.adminService.getWallets(userId);
  }

  @Get('/request-2fa')
  @RequirePermissions(
    'admin',
    anyOf(Permissions.EDIT_SECRET, Permissions.EDIT_OWN_WALLET),
  )
  async request2FA(@UserContext('sub') userId: string): Promise<void> {
    await this.userService.sendTwoFactorAuthenticationCode(userId);
  }

  @Patch('/settlement')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(
    'admin',
    anyOf(Permissions.EDIT_SECRET, Permissions.EDIT_OWN_WALLET),
  )
  async updateSettlementWallet(
    @UserContext('sub') userId: string,
    @Body() updateData: UpdateSettlementWalletDto,
  ): Promise<void> {
    const permission = await this.permissionService.getUserPermissions(userId);
    if (permission.includes(Permissions.EDIT_SECRET)) {
      return this.adminService.editSettlementWallet(
        userId,
        updateData.publicKey,
        updateData.twoFactorAuthenticationCode,
      );
    }

    if (permission.includes(Permissions.EDIT_OWN_WALLET)) {
      return this.adminService.editOwnSettlementWallet(
        userId,
        updateData.publicKey,
        updateData.twoFactorAuthenticationCode,
      );
    }

    throw new ForbiddenException();
  }

  @Patch('/deposit/tron')
  @RequirePermissions('admin', allOf(Permissions.EDIT_SECRET))
  async updateTronDepositWallet(
    @UserContext('sub') userId: string,
    @Body() updateData: UpdateTronDepositWalletDto,
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

    await this.secretsService.setSecret(
      TRON_DEPOSIT_PUBLIC_KEY_SECRET,
      updateData.publicKey,
    );
  }

  @Patch('/deposit/solana')
  @RequirePermissions('admin', allOf(Permissions.EDIT_SECRET))
  async updateSolanaDepositWallet(
    @UserContext('sub') userId: string,
    @Body() updateData: UpdateSolanaDepositWalletDto,
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

    await this.secretsService.setSecret(
      SOLANA_DEPOSIT_PUBLIC_KEY_SECRET,
      updateData.publicKey,
    );
  }

  @Patch('/deposit/ethereum')
  @RequirePermissions('admin', allOf(Permissions.EDIT_SECRET))
  async updateEthereumDepositWallet(
    @UserContext('sub') userId: string,
    @Body() updateData: UpdateEthereumDepositWalletDto,
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

    await this.secretsService.setSecret(
      ETHEREUM_DEPOSIT_PUBLIC_KEY_SECRET,
      updateData.publicKey,
    );
  }

  @Patch('/withdraw/tron')
  @RequirePermissions('admin', allOf(Permissions.EDIT_SECRET))
  async updateTronWithdrawWallet(
    @UserContext('sub') userId: string,
    @Body() updateData: UpdateTronWithdrawWalletDto,
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

    await this.secretsService.setSecret(
      TRON_WITHDRAW_PUBLIC_KEY_SECRET,
      updateData.publicKey,
    );

    await this.secretsService.setSecret(
      TRON_WITHDRAW_PRIVATE_KEY_SECRET,
      updateData.privateKey,
    );
  }

  @Patch('/withdraw/solana')
  @RequirePermissions('admin', allOf(Permissions.EDIT_SECRET))
  async updateSolanaWithdrawWallet(
    @UserContext('sub') userId: string,
    @Body() updateData: UpdateSolanaWithdrawWalletDto,
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

    await this.secretsService.setSecret(
      SOLANA_WITHDRAWAL_PUBLIC_KEY_SECRET,
      updateData.publicKey,
    );

    await this.secretsService.setSecret(
      SOLANA_WITHDRAWAL_PRIVATE_KEY_SECRET,
      updateData.privateKey,
    );
  }

  @Patch('/withdraw/ethereum')
  @RequirePermissions('admin', allOf(Permissions.EDIT_SECRET))
  async updateEthereumWithdrawWallet(
    @UserContext('sub') userId: string,
    @Body() updateData: UpdateEthereumWithdrawWalletDto,
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

    await this.secretsService.setSecret(
      ETHEREUM_WITHDRAWAL_PUBLIC_KEY_SECRET,
      updateData.publicKey,
    );

    await this.secretsService.setSecret(
      ETHEREUM_WITHDRAWAL_PRIVATE_KEY_SECRET,
      updateData.privateKey,
    );
  }

  @Patch('/fees/tron')
  @RequirePermissions('admin', allOf(Permissions.EDIT_SECRET))
  async updateTronFeesWallet(
    @UserContext('sub') userId: string,
    @Body() updateData: UpdateTronFeesWalletDto,
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

    await this.secretsService.setSecret(
      TRON_FEES_PUBLIC_KEY_SECRET,
      updateData.publicKey,
    );

    await this.secretsService.setSecret(
      TRON_FEES_PRIVATE_KEY_SECRET,
      updateData.privateKey,
    );
  }

  @Patch('/fees/solana')
  @RequirePermissions('admin', allOf(Permissions.EDIT_SECRET))
  async updateSolanaFeesWallet(
    @UserContext('sub') userId: string,
    @Body() updateData: UpdateSolanaFeesWalletDto,
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

    await this.secretsService.setSecret(
      SOLANA_FEES_PUBLIC_KEY_SECRET,
      updateData.publicKey,
    );

    await this.secretsService.setSecret(
      SOLANA_FEES_PRIVATE_KEY_SECRET,
      updateData.privateKey,
    );
  }
}
