import { SkipResponseFormatting } from '@common/decorators/skip-response-formatting.decorator';
import { UserContext } from '@common/decorators/user-context.decorator';
import { PagePaginationQueryDto } from '@common/query/page-pagination.query';
import { PagePaginationResponse } from '@common/types';
import { JwtPayload } from '@modules/authentication/types';
import { UserDepositDto } from '@modules/deposits/dto/user-deposit.dto';
import { DepositService } from '@modules/deposits/service/deposit.service';
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { decimalToFixed } from '@utils/decimal-to-fixed';
import { DepositTransactionService } from '../service/deposit-transaction.service';
import { TronUsdtTransferDto } from '../dto/tron-usdt-transfer.dto';
import { SolanaSignFeePayerDto } from '../dto/solana-sign-fee-payer.dto';
import { ForRoles } from '@common/decorators/for-roles.decorator';
import { Roles } from '@modules/role/enum/role.enum';
import { UserDepositService } from '@modules/deposits/service/user-deposit.service';
import { DepositWalletDto } from '@modules/deposits/dto/deposit-wallet.dot';
import { ApiBody, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Web3AuthGuard } from '@modules/authentication/web3auth/guards/web3auth.guard';
import { GenerateNonceDto } from '@modules/authentication/wallet/dto/generate-nonce.dto';
import { ErrorMessages } from '@common/enums/error-messages.enum';
import {
  Web3AuthLoginBody,
  Web3AuthLoginDto,
} from '@modules/authentication/web3auth/dto/web3auth-login.dto';
import { ValidateWalletQuery } from '@modules/deposits/query/validate-wallet.query';
import { Blockchain, DepositTransactionCurrency } from '@infrastructure/database/prisma/constants';
import { Web3AuthPayloadTypes } from '@modules/authentication/web3auth/enum/payload-type.enum';
import { convertEthPublicKeyToAddress } from '@common/helper/convert-public-key-to-address';
import { InvalidWalletAddressError } from '@modules/authentication/web3auth/error/invalid-wallet-address.error';

@Controller('deposits')
@ApiTags('Deposits')
export class DepositController {
  constructor(
    private readonly depositService: DepositService,
    private readonly depositTransactionService: DepositTransactionService,
    private readonly userDepositService: UserDepositService,
  ) {}

  @Get('wallets')
  @ForRoles([Roles.USER])
  @ApiResponse({
    type: DepositWalletDto,
  })
  async getUserDepositWallets(
    @UserContext() { sub }: JwtPayload,
  ): Promise<DepositWalletDto | null> {
    const wallet = await this.userDepositService.getUserDepositWallet(sub);
    if (!wallet) {
      return null;
    }

    return DepositWalletDto.from(wallet);
  }

  @Get('timestamps/:blockchain')
  @ForRoles([Roles.USER])
  @ApiResponse({
    type: Number,
  })
  async getLastDepositBlockTimestamp(
    @Param('blockchain', ParseIntPipe) blockchain: number,
  ): Promise<{ timestamp: string | null }> {
    if (!Object.values(Blockchain).includes(blockchain)) {
      throw new BadRequestException(ErrorMessages.INVALID_CHAIN);
    }

    const timestamp = await this.userDepositService.getLastDepositBlockTimestamp(blockchain);
    return { timestamp };
  }

  @Post('wallets')
  @ForRoles([Roles.USER])
  @ApiBody({ type: Web3AuthLoginBody })
  @ApiQuery({ type: ValidateWalletQuery })
  @UseGuards(Web3AuthGuard)
  async selectBlockchain(
    @UserContext() { sub }: JwtPayload,
    @Body() selectWalletBody: Web3AuthLoginDto,
    @Query() query: ValidateWalletQuery,
  ): Promise<DepositWalletDto> {
    const verifier = this.getVerifierAddress(selectWalletBody);

    if (!verifier) {
      throw new BadRequestException(ErrorMessages.INVALID_LOGIN_SIGNATURE);
    }

    const selectedChain = selectWalletBody.authValidation.blockchain;

    const normalizedChain = `${selectedChain[0].toUpperCase()}${selectedChain.slice(1)}`;
    const parsedBlockchain =
      Blockchain[normalizedChain as keyof typeof Blockchain];

    const wallet = await this.userDepositService.selectBlockchain(sub, {
      blockchain: parsedBlockchain,
      targetSignature: query.targetSignature,
      verifierSignature: query.validatorSignature,
      walletAddress: query.address,
      verifierAddress: verifier,
    });
    return DepositWalletDto.from(wallet);
  }

  private getVerifierAddress(selectWalletBody: Web3AuthLoginDto): string {
    const jwtPayload = selectWalletBody.jwtPayload;
    if (jwtPayload.type === Web3AuthPayloadTypes.SOCIALS) {
      const appKey = jwtPayload.wallets.find(
        (wallet) => wallet.type === 'web3auth_app_key',
      );
      if (!appKey) {
        throw new InvalidWalletAddressError({ errors: { wallet: appKey } });
      }
      return convertEthPublicKeyToAddress(appKey?.public_key);
    }

    if (jwtPayload.type === Web3AuthPayloadTypes.EXTERNAL) {
      const wallet = (
        selectWalletBody.jwtPayload.wallets as {
          address: string;
        }[]
      ).at(0);

      if (!wallet) {
        throw new InvalidWalletAddressError({ errors: { wallet } });
      }
      return wallet.address;
    }

    throw new InvalidWalletAddressError({});
  }

  @Put('wallets/nonce')
  @ForRoles([Roles.USER])
  @ApiResponse({
    schema: {
      type: 'object',
      properties: {
        nonce: { type: 'string' },
      },
    },
  })
  async generateNonce(
    @UserContext() { sub }: JwtPayload,
    @Body() { walletAddress }: GenerateNonceDto,
  ): Promise<{ nonce: string }> {
    const nonce = await this.userDepositService.generateNonce(
      sub,
      walletAddress,
    );

    return { nonce };
  }

  @Get('details')
  @SkipResponseFormatting()
  async details(): Promise<{
    [x: number]:
      | [{
          depositAddress: string;
          usdtMint: string;
        },
       {
          depositAddress: string;
          usdcMint: string;
        }]
      | undefined;
  }> {
    return this.depositService.getDetails();
  }

  @Get('')
  async getDeposits(
    @UserContext() { sub }: JwtPayload,
    @Query() { limit, page }: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<UserDepositDto>> {
    const deposits = await this.depositService.getUserDeposits(
      sub,
      page,
      limit,
    );
    return {
      limit,
      page,
      total: deposits.count,
      data: deposits.data.map(
        (deposit) =>
          new UserDepositDto({
            id: deposit.id,
            transactionId: deposit.transaction_id,
            createdAt: deposit.created_at,
            amount: decimalToFixed(deposit.amount),
            status: deposit.status,
            currency: deposit.currency,
            blockchain: deposit.blockchain,
            usdAmount: deposit.usd_amount,
            cryptoAmount: deposit.crypto_amount,
          }),
      ),
    };
  }

  @Post('trx/send-usdt')
  async sendTrxUsdt(
    @UserContext() { sub }: JwtPayload,
    @Body() transferInput: TronUsdtTransferDto,
  ): Promise<string> {
    const job = await this.depositTransactionService.enqueueTronUSDTokenTransferJob({
      state: 'pending',
      userId: sub,
      address: transferInput.address,
      presignedTx: transferInput.tx,
      amount: transferInput.amount,
      currency: DepositTransactionCurrency.Usdt,
    });

    return await job.finished();
  }

  @Post('trx/send-usdc')
  async sendTrxUsdc(
    @UserContext() { sub }: JwtPayload,
    @Body() transferInput: TronUsdtTransferDto,
  ): Promise<boolean> {
    await this.depositTransactionService.enqueueTronUSDTokenTransferJob({
      state: 'pending',
      userId: sub,
      address: transferInput.address,
      presignedTx: transferInput.tx,
      amount: transferInput.amount,
      currency: DepositTransactionCurrency.Usdc,
    });

    return true;
  }

  @Post('solana/sign-fee-payer')
  async solanaSignFeePayer(
    @UserContext() { sub }: JwtPayload,
    @Body() solanaSignFeePayerDto: SolanaSignFeePayerDto,
  ): Promise<{ signedTransaction: string }> {
    return await this.depositTransactionService.solanaSignFeePayer(
      solanaSignFeePayerDto.publicKey,
      solanaSignFeePayerDto.amount,
      solanaSignFeePayerDto.currency,
    );
  }

  @Get('users/first-time-deposit')
  @ForRoles([Roles.USER])
  async userHasFirstDeposit(
    @UserContext('sub') userId: string,
  ): Promise<{ hasFirstDeposit: boolean }> {
    const hasFirstTimeDeposit =
      await this.depositService.userHasFirstTimeDeposit(userId);

    return { hasFirstDeposit: hasFirstTimeDeposit };
  }
}
