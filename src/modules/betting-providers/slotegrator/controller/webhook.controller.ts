/* eslint-disable sonarjs/no-duplicate-string */
import { Public } from '@common/decorators/public-route.decorator';
import { SkipResponseFormatting } from '@common/decorators/skip-response-formatting.decorator';
import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Patch,
  Post,
} from '@nestjs/common';
import {
  SlotegratorEventBalanceAction,
  SlotegratorEventBalanceActionSchema,
  SlotegratorEventBetAction,
  SlotegratorEventBetActionSchema,
  SlotegratorEventRefundAction,
  SlotegratorEventRefundActionSchema,
  SlotegratorEventResult,
  SlotegratorEventResultBalance,
  SlotegratorEventResultBet,
  SlotegratorEventResultRefund,
  SlotegratorEventResultRollback,
  SlotegratorEventResultwin,
  SlotegratorEventRollbackAction,
  SlotegratorEventRollbackActionSchema,
  SlotegratorEventSchemaBase,
  SlotegratorEventWinAction,
  SlotegratorEventWinActionSchema,
  SlotegratorSportsBookBalanceRequestSchema,
  SlotegratorSportsBookBalanceResponse,
  SlotegratorSportsBookBetRequestSchema,
  SlotegratorSportsBookBetResponse,
  SlotegratorSportsBookCloseRequestSchema,
  SlotegratorSportsBookCloseResponse,
  SlotegratorSportsBookCommitRequestSchema,
  SlotegratorSportsBookCommitResponse,
  SlotegratorSportsBookRefundRequestSchema,
  SlotegratorSportsBookRefundResponse,
  SlotegratorSportsBookRollbackRequestSchema,
  SlotegratorSportsBookRollbackResponse,
  SlotegratorSportsBookSettlementRequestSchema,
  SlotegratorSportsBookSettlementResponse,
  SlotegratorSportsBookWinRequestSchema,
  SlotegratorSportsBookWinResponse,
} from '../dto/event.dto';
import { SlotegratorError } from '../error';
import { calculateWebhookSignature, SlotegratorGame } from '../service/client';
import { ConfigService } from '@nestjs/config';
import { ENV } from '@common/env';
import {
  PlaceSportsBookBetResult,
  SlotegratorService,
} from '../service/slotegrator.service';
import { decimalToNumber } from '@utils/decimal-do-number';
import z, { ZodSchema } from 'zod/lib';
import { SlotegratorProducer } from '../producer/slotegrator.producer';
import { Decimal } from '@prisma/client/runtime/library';
import { SnapshotRequests } from '@common/decorators/snapshot-requests.decorator';
import { allOf, RequirePermissions } from '@modules/permission/decorator/require-permissions.decorator';
import { Permissions } from '@modules/permission/enum/permission.enum';

interface GuardRequestBodyOptions {
  merchantId: string;
  merchantKey: string;
}

interface GuardRequestBodyHeader {
  expectedSignature: string;
  nonce: string;
  timestamp: string;
}

function guardRequestBody<T extends ZodSchema>(
  schema: T,
  body: Record<string, any>,
  header: GuardRequestBodyHeader,
  options: GuardRequestBodyOptions,
  logger: Logger,
): z.infer<T> {
  const signature = calculateWebhookSignature(
    {
      'X-Merchant-Id': options.merchantId,
      'X-Nonce': header.nonce,
      'X-Timestamp': header.timestamp,
    },
    body,
    options.merchantKey,
  );

  logger.log(
    'Received sportsbook event',
    {
      'X-Merchant-Id': options.merchantId,
      'X-Nonce': header.nonce,
      'X-Timestamp': header.timestamp,
    },
    body,
    signature,
    header.expectedSignature,
  );

  if (signature !== header.expectedSignature) {
    Logger.error('Invalid signature');
    // throw new SlotegratorError('INTERNAL_ERROR', 'Invalid signature');
  }

  const parseBaseEvent = schema.safeParse(body);
  if (!parseBaseEvent.success) {
    Logger.error('invalid payload', parseBaseEvent.error);
    // eslint-disable-next-line sonarjs/no-duplicate-string
    throw new SlotegratorError('INTERNAL_ERROR', 'Invalid payload');
  }

  return parseBaseEvent.data;
}

@Controller('slotegrator')
export class SlotegratorWebhookController {
  private readonly merchantKey = this.configService.getOrThrow(
    ENV.SLOTEGRATOR_MERCHANT_KEY,
  );

  private readonly sportsbookMerchantKey = this.configService.getOrThrow(
    ENV.SLOTEGRATOR_SPORTSBOOK_MERCHANT_KEY,
  );

  private readonly _logger = new Logger(SlotegratorWebhookController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly slotegratorService: SlotegratorService,
    private readonly slotegratorProducer: SlotegratorProducer,
  ) {}

  @Patch('/refetch-games')
  @RequirePermissions('admin', allOf(Permissions.EDIT_GAMES))
  async refresh(): Promise<SlotegratorGame[]> {
    return await this.slotegratorService.importGames()
  }

  @Post('event')
  @Public()
  @SkipResponseFormatting()
  @HttpCode(200)
  @SnapshotRequests('slotegrator-games')
  async handleEvent(
    @Headers('X-Merchant-Id') merchantId: string,
    @Headers('X-Nonce') nonce: string,
    @Headers('X-Timestamp') timestamp: string,
    @Headers('X-Sign') expectedSignature: string,
    @Body() body: Record<string, any>,
  ): Promise<SlotegratorEventResult> {
    const signature = calculateWebhookSignature(
      {
        'X-Merchant-Id': merchantId,
        'X-Nonce': nonce,
        'X-Timestamp': timestamp,
      },
      body,
      this.merchantKey,
    );

    this._logger.log(
      'Received event',
      {
        'X-Merchant-Id': merchantId,
        'X-Nonce': nonce,
        'X-Timestamp': timestamp,
      },
      body,
      signature,
      expectedSignature,
    );

    if (signature !== expectedSignature) {
      this._logger.error('Invalid signature', {
        signature,
        expectedSignature,
      });
      throw new SlotegratorError('INTERNAL_ERROR', 'Invalid signature');
    }

    const parseBaseEvent = SlotegratorEventSchemaBase.safeParse(body);
    if (!parseBaseEvent.success) {
      this._logger.error('invalid payload', parseBaseEvent.error);
      // eslint-disable-next-line sonarjs/no-duplicate-string
      throw new SlotegratorError('INTERNAL_ERROR', 'Invalid payload');
    }
    const action = parseBaseEvent.data.action;

    try {
      switch (action) {
        case 'balance': {
          const eventResult =
            SlotegratorEventBalanceActionSchema.safeParse(body);
          if (!eventResult.success) {
            this._logger.error('invalid payload balance', eventResult.error);
            throw new SlotegratorError('INTERNAL_ERROR', 'Invalid payload');
          }

          return this.handleBalanceAction(eventResult.data);
        }
        case 'bet': {
          const eventResult = SlotegratorEventBetActionSchema.safeParse(body);
          if (!eventResult.success) {
            this._logger.error('invalid payload bet', eventResult.error);
            throw new SlotegratorError('INTERNAL_ERROR', 'Invalid payload');
          }
          return this.handleBetAction(eventResult.data);
        }
        case 'win': {
          const eventResult = SlotegratorEventWinActionSchema.safeParse(body);
          if (!eventResult.success) {
            this._logger.error('invalid payload win', eventResult.error);
            throw new SlotegratorError('INTERNAL_ERROR', 'Invalid payload');
          }
          return this.handleWinAction(eventResult.data);
        }
        case 'refund': {
          const eventResult =
            SlotegratorEventRefundActionSchema.safeParse(body);
          if (!eventResult.success) {
            this._logger.error('invalid payload refund', eventResult.error);
            throw new SlotegratorError('INTERNAL_ERROR', 'Invalid payload');
          }

          return this.handleRefundAction(eventResult.data);
        }
        case 'rollback': {
          const eventResult =
            SlotegratorEventRollbackActionSchema.safeParse(body);
          if (!eventResult.success) {
            this._logger.error('invalid payload rollback', eventResult.error);
            throw new SlotegratorError('INTERNAL_ERROR', 'Invalid payload');
          }

          return this.handleRollbackAction(eventResult.data);
        }
      }
    } catch (e) {
      this._logger.error(e);
      throw e;
    }
  }

  private async handleBalanceAction(
    action: SlotegratorEventBalanceAction,
  ): Promise<SlotegratorEventResultBalance> {
    const balance = await this.slotegratorService.getUserBalance(
      action.player_id,
    );

    this._logger.log('got balance', balance);

    return {
      // TO DO
      balance: decimalToNumber(balance.div(100), 2),
    };
  }

  private async handleBetAction(
    action: SlotegratorEventBetAction,
  ): Promise<SlotegratorEventResultBet> {
    const result = await this.slotegratorService.placeGameBet({
      amount: action.amount,
      currency: action.currency,
      gameId: action.game_uuid,
      playerId: action.player_id,
      type: action.type,
      transactionId: action.transaction_id,
      sessionId: action.session_id,
      roundId: action.round_id,
      roundFinished: action.finished,
    });

    this._logger.log('place bet', result);

    return {
      balance: decimalToNumber(result.balance.div(100), 2),
      transaction_id: result.transaction,
    };
  }

  private async handleWinAction(
    action: SlotegratorEventWinAction,
  ): Promise<SlotegratorEventResultwin> {
    const result = await this.slotegratorService.settleGameBetWin({
      amount: action.amount,
      currency: action.currency,
      gameId: action.game_uuid,
      playerId: action.player_id,
      type: action.type,
      transactionId: action.transaction_id,
      sessionId: action.session_id,
      roundId: action.round_id,
      roundFinished: action.finished,
    });

    this._logger.log('settle bet', result);

    return {
      balance: decimalToNumber(result.balance.div(100), 2),
      transaction_id: result.transaction,
    };
  }

  private async handleRefundAction(
    action: SlotegratorEventRefundAction,
  ): Promise<SlotegratorEventResultRefund> {
    const result = await this.slotegratorService.settleGameBetRefund({
      amount: action.amount,
      currency: action.currency,
      gameId: action.game_uuid,
      playerId: action.player_id,
      type: action.type,
      transactionId: action.transaction_id,
      betTransactionId: action.bet_transaction_id,
      sessionId: action.session_id,
      roundId: action.round_id,
      roundFinished: action.finished,
    });

    this._logger.log('refund bet', result);

    return {
      balance: decimalToNumber(result.balance.div(100), 2),
      transaction_id: result.transaction,
    };
  }

  private async handleRollbackAction(
    action: SlotegratorEventRollbackAction,
  ): Promise<SlotegratorEventResultRollback> {
    const result = await this.slotegratorService.settleGameBetRollback({
      currency: action.currency,
      gameId: action.game_uuid,
      playerId: action.player_id,
      transactionId: action.transaction_id,
      sessionId: action.session_id,
      rollbackTransactions: action.rollback_transactions.map((r) => ({
        action: r.action,
        amount: r.amount,
        transactionId: r.transaction_id,
      })),
    });

    this._logger.log('rollback transactions', result);

    return {
      balance: decimalToNumber(result.balance.div(100), 2),
      transaction_id: result.transaction,
      rollback_transactions: result.rollbackTransactionIds,
    };
  }

  @Post('sportsbook/event/balance')
  @Public()
  @SkipResponseFormatting()
  @HttpCode(200)
  @SnapshotRequests('slotegrator-sportsbook')
  async sportsBookBalance(
    @Headers('X-Merchant-Id') merchantId: string,
    @Headers('X-Nonce') nonce: string,
    @Headers('X-Timestamp') timestamp: string,
    @Headers('X-Sign') expectedSignature: string,
    @Body() body: Record<string, any>,
  ): Promise<SlotegratorSportsBookBalanceResponse> {
    const event = guardRequestBody(
      SlotegratorSportsBookBalanceRequestSchema,
      body,
      { nonce, timestamp, expectedSignature },
      { merchantId, merchantKey: this.sportsbookMerchantKey },
      this._logger,
    );

    const balance = await this.slotegratorService.getUserBalance(
      event.player_id,
    );

    return {
      balance: decimalToNumber(balance.div(100), 3),
    };
  }

  @Post('sportsbook/event/bet')
  @Public()
  @SkipResponseFormatting()
  @HttpCode(200)
  @SnapshotRequests('slotegrator-sportsbook')
  async sportsBookPlaceBet(
    @Headers('X-Merchant-Id') merchantId: string,
    @Headers('X-Nonce') nonce: string,
    @Headers('X-Timestamp') timestamp: string,
    @Headers('X-Sign') expectedSignature: string,
    @Body() body: Record<string, any>,
  ): Promise<SlotegratorSportsBookBetResponse> {
    const event = guardRequestBody(
      SlotegratorSportsBookBetRequestSchema,
      body,
      { nonce, timestamp, expectedSignature },
      { merchantId, merchantKey: this.sportsbookMerchantKey },
      this._logger,
    );

    const job = await this.slotegratorProducer.enqueueSportsbookPlaceBetJob({
      amount: event.amount,
      currency: event.currency,
      playerId: event.player_id,
      betslipId: event.betslip_id,
      betslip: event.betslip,
      transactionId: event.transaction_id,
      sessionId: event.session_id,
      sportsbookUuid: event.sportsbook_uuid,
    });

    try {
      const result: PlaceSportsBookBetResult = await job.finished();

      return {
        transaction_id: result.transaction,
        balance: decimalToNumber(new Decimal(result.balance).div(100), 3),
      };
    } catch (error) {
      throw new SlotegratorError(error.message);
    }
  }

  @Post('sportsbook/event/commit')
  @Public()
  @SkipResponseFormatting()
  @HttpCode(200)
  @SnapshotRequests('slotegrator-sportsbook')
  async sportsBookCommit(
    @Headers('X-Merchant-Id') merchantId: string,
    @Headers('X-Nonce') nonce: string,
    @Headers('X-Timestamp') timestamp: string,
    @Headers('X-Sign') expectedSignature: string,
    @Body() body: Record<string, any>,
  ): Promise<SlotegratorSportsBookCommitResponse> {
    const event = guardRequestBody(
      SlotegratorSportsBookCommitRequestSchema,
      body,
      { nonce, timestamp, expectedSignature },
      { merchantId, merchantKey: this.sportsbookMerchantKey },
      this._logger,
    );

    try {
      const result = await this.slotegratorService.commitSportsBookBet({
        amount: event.amount,
        currency: event.currency,
        playerId: event.player_id,
        betslipId: event.betslip_id,
        betslip: event.betslip,
        transactionId: event.transaction_id,
        sessionId: event.session_id,
        sportsbookUuid: event.sportsbook_uuid,
      });

      return {
        balance: decimalToNumber(new Decimal(result.balance).div(100), 3),
      };
    } catch (error) {
      throw new SlotegratorError(error.message);
    }
  }

  @Post('sportsbook/event/win')
  @Public()
  @SkipResponseFormatting()
  @HttpCode(200)
  @SnapshotRequests('slotegrator-sportsbook')
  async sportsBookWin(
    @Headers('X-Merchant-Id') merchantId: string,
    @Headers('X-Nonce') nonce: string,
    @Headers('X-Timestamp') timestamp: string,
    @Headers('X-Sign') expectedSignature: string,
    @Body() body: Record<string, any>,
  ): Promise<SlotegratorSportsBookWinResponse> {
    const event = guardRequestBody(
      SlotegratorSportsBookWinRequestSchema,
      body,
      { nonce, timestamp, expectedSignature },
      { merchantId, merchantKey: this.sportsbookMerchantKey },
      this._logger,
    );

    const result = await this.slotegratorService.settleSportsBookBetWin({
      amount: event.amount,
      currency: event.currency,
      playerId: event.player_id,
      betslipId: event.betslip_id,
      betslip: event.betslip,
      transactionId: event.transaction_id,
      sessionId: event.session_id,
      sportsbookUuid: event.sportsbook_uuid,
    });

    return {
      transaction_id: result.transaction,
      balance: decimalToNumber(result.balance.div(100), 3),
    };
  }

  @Post('sportsbook/event/refund')
  @Public()
  @SkipResponseFormatting()
  @HttpCode(200)
  @SnapshotRequests('slotegrator-sportsbook')
  async sportsBookRefund(
    @Headers('X-Merchant-Id') merchantId: string,
    @Headers('X-Nonce') nonce: string,
    @Headers('X-Timestamp') timestamp: string,
    @Headers('X-Sign') expectedSignature: string,
    @Body() body: Record<string, any>,
  ): Promise<SlotegratorSportsBookRefundResponse> {
    const event = guardRequestBody(
      SlotegratorSportsBookRefundRequestSchema,
      body,
      { nonce, timestamp, expectedSignature },
      { merchantId, merchantKey: this.sportsbookMerchantKey },
      this._logger,
    );

    const result = await this.slotegratorService.settleSportsBookBetRefund({
      amount: event.amount,
      currency: event.currency,
      playerId: event.player_id,
      betslipId: event.betslip_id,
      transactionId: event.transaction_id,
      sessionId: event.session_id,
      sportsbookUuid: event.sportsbook_uuid,
      refTransactionId: event.ref_transaction_id,
      type: event.type,
    });
    return {
      transaction_id: result.transaction,
      balance: decimalToNumber(result.balance.div(100), 3),
    };
  }

  @Post('sportsbook/event/close')
  @Public()
  @SkipResponseFormatting()
  @HttpCode(200)
  @SnapshotRequests('slotegrator-sportsbook')
  async sportsBookClose(
    @Headers('X-Merchant-Id') merchantId: string,
    @Headers('X-Nonce') nonce: string,
    @Headers('X-Timestamp') timestamp: string,
    @Headers('X-Sign') expectedSignature: string,
    @Body() body: Record<string, any>,
  ): Promise<SlotegratorSportsBookCloseResponse> {
    guardRequestBody(
      SlotegratorSportsBookCloseRequestSchema,
      body,
      { nonce, timestamp, expectedSignature },
      { merchantId, merchantKey: this.sportsbookMerchantKey },
      this._logger,
    );

    return {};
  }

  @Post('sportsbook/event/settle')
  @Public()
  @SkipResponseFormatting()
  @HttpCode(200)
  @SnapshotRequests('slotegrator-sportsbook')
  async sportsBookSettle(
    @Headers('X-Merchant-Id') merchantId: string,
    @Headers('X-Nonce') nonce: string,
    @Headers('X-Timestamp') timestamp: string,
    @Headers('X-Sign') expectedSignature: string,
    @Body() body: Record<string, any>,
  ): Promise<SlotegratorSportsBookSettlementResponse> {
    const event = guardRequestBody(
      SlotegratorSportsBookSettlementRequestSchema,
      body,
      { nonce, timestamp, expectedSignature },
      { merchantId, merchantKey: this.sportsbookMerchantKey },
      this._logger,
    );

    const balance = await this.slotegratorService.getUserBalance(
      event.player_id,
    );

    const isBetSettled = await this.slotegratorService.sportsBookBetSettled(
      event.player_id,
      event.betslip_id,
    );
    return {
      balance: decimalToNumber(balance.div(100), 3),
      status: isBetSettled ? 'settled' : 'open',
    };
  }

  @Post('sportsbook/event/rollback')
  @Public()
  @SkipResponseFormatting()
  @HttpCode(200)
  @SnapshotRequests('slotegrator-sportsbook')
  async sportsBookRollback(
    @Headers('X-Merchant-Id') merchantId: string,
    @Headers('X-Nonce') nonce: string,
    @Headers('X-Timestamp') timestamp: string,
    @Headers('X-Sign') expectedSignature: string,
    @Body() body: Record<string, any>,
  ): Promise<SlotegratorSportsBookRollbackResponse> {
    const event = guardRequestBody(
      SlotegratorSportsBookRollbackRequestSchema,
      body,
      { nonce, timestamp, expectedSignature },
      { merchantId, merchantKey: this.sportsbookMerchantKey },
      this._logger,
    );

    const result = await this.slotegratorService.settleSportsBookBetRollback({
      currency: event.currency,
      playerId: event.player_id,
      betslipId: event.betslip_id,
      transactionId: event.transaction_id,
      parentTransactionId: event.parent_transaction_id,
      betTransactionId: event.bet_transaction_id,
      amount: event.amount,
    });
    return {
      balance: decimalToNumber(result.balance.div(100), 3),
      transaction_id: result.transaction,
    };
  }
}
