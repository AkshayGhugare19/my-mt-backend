import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from 'src/app.module';
import { Transaction, User } from '@prisma/client';
import { UserService } from '@modules/user/services/user.service';
import { randomUUID } from 'crypto';
import { BalanceService } from '@modules/balance/service/balance.service';
import { Decimal } from '@prisma/client/runtime/library';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { PartnerMatrixApi } from '@external/partner-matrix/api';
import { PartnerMatrixApiMock } from 'test/e2e/mocks/partner-matrix-api.mock';
import { SlotegratorWebhookController } from '@modules/betting-providers/slotegrator/controller/webhook.controller';
import { SlotegratorEventBetAction, SlotegratorEventRefundAction, SlotegratorEventRollbackAction, SlotegratorEventWinAction, SlotegratorSportsBookBetRequest, SlotegratorSportsBookSettlementRequest, SlotegratorSportsBookWinRequest } from '@modules/betting-providers/slotegrator/dto/event.dto';
import data from './data.json'
import * as client from '@modules/betting-providers/slotegrator/service/client';
import { decimalToNumber } from '@utils/decimal-do-number';
import { TransactionLedgerService } from '@modules/transaction-ledger/service/transaction-ledger.service';
import { CreateTransactionBody } from '@external/partner-matrix/bodies';
import { TransactionOperationTypes } from '@modules/transaction-ledger/enum/type.enum';
import { PartnerMatrixCron } from '@infrastructure/cron-jobs/producer/partner-matrix.cron';
// import { BonusAdminController } from '@modules/bonus/controller/bonus-admin.controller';

interface TestData {
  userId: string;
  partnerMatrixId: number;
  balanceAfterTest: number;
  numberOfDebitTransactions: number;
  numberOfCreditTransactions: number;
  numberOfStakeEvents: number;
  numberOfWinEvents: number;
  totalStakeInEvents: number;
  totalWinInEvents: number;
  totalDebit: number;
  totalCredit: number;
  totalLoss: number;
  totalWin: number;
  transactionsAndEvents: {
    error?: string;
    transaction: Transaction;
    events?: CreateTransactionBody[];
  }[];
}

describe('PartnerMatrixBetEvents (e2e)', () => {
  vi.setConfig({
    testTimeout: 100000,
  });
  let app: INestApplication;
  let testUser: Partial<User>;
  let testData: TestData = {} as TestData;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).overrideProvider(PartnerMatrixApi).useClass(PartnerMatrixApiMock).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  beforeAll(async () => {
    testUser = await app.get(UserService).createCredentialsUser({
      email: `${randomUUID()}@test.com`,
      password: 'test',
      partnerMatrixBtag: randomUUID(),
    });

    await app.get(BalanceService).incrementUserBalance(testUser.id!, new Decimal(1_000_000))
    vi.spyOn(client, 'calculateWebhookSignature').mockImplementation(() => '');
    // const bonusController = app.get(BonusAdminController);
    // await bonusController.createUserBonus({
    //   userIds: [testUser.id!],
    //   bonusId: 'clz14t0xf000z12304vl80cnm',
    //   amount: 100,
    // });
    testData = {
      userId: testUser.id!,
      partnerMatrixId: testUser.partnerMatrixId!,
      balanceAfterTest: 0,
      numberOfDebitTransactions: 0,
      numberOfCreditTransactions: 0,
      numberOfStakeEvents: 0,
      numberOfWinEvents: 0,
      transactionsAndEvents: [],
      totalStakeInEvents: 0,
      totalWinInEvents: 0,
      totalDebit: 0,
      totalCredit: 0,
      totalLoss: 0,
      totalWin: 0,
    }
  })

  afterAll(async (t) => {
    await app.close();
    writeFileSync(resolve(__dirname, `test-result-${t.id}.json`), JSON.stringify(testData, null, 2));
  })

  test('should be defined', () => {
    expect(true).toBe(true);
  });

  // eslint-disable-next-line sonarjs/cognitive-complexity
  test('should place sportsbook bet', async () => {
    const webhookController = app.get(SlotegratorWebhookController);
    const transactionLedgerService = app.get(TransactionLedgerService);
    const partnerMatrixApi = app.get(PartnerMatrixApi);

    // const slice = data.find(event => event.placeBet.transactionId === '46571ca128164646bbf91eb9ec963839')!;

    const transactionSpy = vi.spyOn(transactionLedgerService, 'create')
    const eventSpy = vi.spyOn(partnerMatrixApi, 'createTransactionBulk')

    for (const event of data) {
      const placeBet = event.placeBet;
      if ('betslip' in placeBet) {
        const txId = await placeSportsbookBetEvent(webhookController, {
          action: 'bet',
          amount: placeBet.amount,
          currency: placeBet.currency,
          betslip: placeBet.betslip!,
          betslip_id: placeBet.betslipId!,
          session_id: placeBet.sessionId,
          player_id: testUser.id!,
          transaction_id: placeBet.transactionId + `-${crypto.randomUUID()}`,
          sportsbook_uuid: placeBet.sportsbookUuid!,
        })
        expect(txId, `transactionId should be defined when placing bet: ${JSON.stringify(placeBet)}`).toBeDefined();

        const settleBets = Array.isArray(event.settleBet) ? event.settleBet : [event.settleBet];
        for (const settleBet of settleBets) {
          if (settleBet.type === 'win' && 'betslip' in settleBet) {
            const transactionId = await placeSportsbookWinEvent(webhookController, {
              action: 'win',
              amount: settleBet.amount,
              currency: settleBet.currency,
              betslip: settleBet.betslip!,
              betslip_id: settleBet.betslipId!,
              session_id: settleBet.sessionId,
              player_id: testUser.id!,
              transaction_id: settleBet.transactionId + `-${crypto.randomUUID()}`,
              sportsbook_uuid: settleBet.sportsbookUuid!,
            })
            expect(transactionId, `transactionId should be defined when placing win: ${JSON.stringify(settleBet)}`).toBeDefined();

            const settleStatus = await placeSportsbookSettleEvent(webhookController, {
              action: 'settle',
              betslip_id: settleBet.betslipId!,
              player_id: testUser.id!,
              currency: settleBet.currency,
            })
            expect(settleStatus, `settleStatus should be defined when settling win: ${JSON.stringify(settleBet)}`).toBeDefined();
          }
        }
      } else {
        if (placeBet.type === 'bet') {
          const transactionId = await handleEvent(webhookController, {
            action: 'bet',
            amount: placeBet.amount,
            currency: placeBet.currency,
            game_uuid: placeBet.gameId,
            player_id: testUser.id!,
            transaction_id: placeBet.transactionId + `-${crypto.randomUUID()}`,
            session_id: placeBet.sessionId,
            type: placeBet.type,
            round_id: placeBet.roundId,
            finished: placeBet.roundFinished,
          })
          expect(transactionId, `transactionId should be defined when placing bet: ${JSON.stringify(placeBet)}`).toBeDefined();
        }
        const settleBets = Array.isArray(event.settleBet) ? event.settleBet : [event.settleBet];

        for (const settleBet of settleBets) {
          if (settleBet.type === 'win') {
            const transactionId = await handleEvent(webhookController, {
              action: 'win',
              amount: settleBet.amount,
              currency: settleBet.currency,
              game_uuid: placeBet.gameId,
              player_id: testUser.id!,
              transaction_id: settleBet.transactionId + `-${crypto.randomUUID()}`,
              session_id: settleBet.sessionId,
              type: settleBet.type,
              finished: settleBet.roundFinished,
              round_id: settleBet.roundId,
            })
            expect(transactionId, `transactionId should be defined when placing win: ${JSON.stringify(settleBet)}`).toBeDefined();
          }
        }
        // The dataset had no other types of events
      }
    }

    const pmCron = app.get(PartnerMatrixCron);
    await pmCron.pushData();
    await pmCron.pushData();
    await pmCron.pushData();
    await pmCron.pushData();

    const transactions = transactionSpy.mock.settledResults.map(result => result.value)
    const events = eventSpy.mock.calls.map(call => call[0]).flatMap(event => event)
    const eventTransactionMap = new Map<string, CreateTransactionBody[]>();
    events.forEach(event => {
      event.transactions.forEach(transaction => {
        if (transaction.type === 'stake_amount') {
          testData.numberOfStakeEvents++
        } else if (transaction.type === 'win_amount') {
          testData.numberOfWinEvents++
        }
        if (!eventTransactionMap.has(transaction.external_id)) {
          eventTransactionMap.set(transaction.external_id, [])
        }
        eventTransactionMap.get(transaction.external_id)!.push(event)
      })
    })
    transactions.forEach(transaction => {
      if (transaction.operationType === TransactionOperationTypes.DEBIT) {
        testData.numberOfDebitTransactions++
      } else if (transaction.operationType === TransactionOperationTypes.CREDIT) {
        testData.numberOfCreditTransactions++
      }
      const events = eventTransactionMap.get(transaction.id)
      if (events) {
        testData.transactionsAndEvents.push({
          transaction,
          events,
        })
      } else {
        testData.transactionsAndEvents.push({
          transaction,
          error: 'event not found',
        })
      }
    })

    const { totalDebit, totalCredit } = transactions.reduce((acc, transaction): { totalDebit: number, totalCredit: number } => {
      if (transaction.operationType === TransactionOperationTypes.DEBIT) {
        acc.totalDebit += decimalToNumber(transaction.amount);
      } else if (transaction.operationType === TransactionOperationTypes.CREDIT) {
        acc.totalCredit += decimalToNumber(transaction.amount);
      }
      return acc;
    }, { totalDebit: 0, totalCredit: 0 });

    const { totalStake, totalWin } = events.reduce((acc, event): { totalStake: number, totalWin: number } => {
      const totalStakeAmount = event.transactions.reduce((acc, transaction) => {
        if (transaction.type === 'stake_amount' && transaction.amount) {
          acc += transaction.amount;
        }
        return acc;
      }, 0);
      const totalWinAmount = event.transactions.reduce((acc, transaction) => {
        if (transaction.type === 'win_amount' && transaction.amount) {
          acc += transaction.amount;
        }
        return acc;
      }, 0);
      acc.totalStake += totalStakeAmount;
      acc.totalWin += totalWinAmount;
      return acc;
    }, { totalStake: 0, totalWin: 0 });

    const balance = await app.get(BalanceService).getBalanceAnd(testUser.id!, {
      totalLoss: true,
      totalWin: true,
    });

    expect(balance, 'balance should be defined when placing bet').toBeDefined();
    testData.balanceAfterTest = decimalToNumber(balance?.balance || 0);
    testData.totalStakeInEvents = totalStake;
    testData.totalWinInEvents = totalWin;
    testData.totalDebit = totalDebit;
    testData.totalCredit = totalCredit;
    testData.totalLoss = decimalToNumber(balance?.totalLoss || 0);
    testData.totalWin = decimalToNumber(balance?.totalWin || 0);
  })
});

const placeSportsbookBetEvent = async (webhookController: SlotegratorWebhookController, event: SlotegratorSportsBookBetRequest): Promise<string> => {
  const result = await webhookController.sportsBookPlaceBet('', '', '', '', event)

  return result.transaction_id;
}

const placeSportsbookWinEvent = async (webhookController: SlotegratorWebhookController, event: SlotegratorSportsBookWinRequest): Promise<string> => {
  const result = await webhookController.sportsBookWin('', '', '', '', event)

  return result.transaction_id;
}

const placeSportsbookSettleEvent = async (webhookController: SlotegratorWebhookController, event: SlotegratorSportsBookSettlementRequest): Promise<string> => {
  const result = await webhookController.sportsBookSettle('', '', '', '', event)

  return result.status;
}

const handleEvent = async (webhookController: SlotegratorWebhookController, event: SlotegratorEventBetAction | SlotegratorEventWinAction | SlotegratorEventRefundAction | SlotegratorEventRollbackAction): Promise<string | null> => {
  const result = await webhookController.handleEvent('', '', '', '', event)
  if ('transaction_id' in result) {
    return result.transaction_id;
  }

  return null;
}
