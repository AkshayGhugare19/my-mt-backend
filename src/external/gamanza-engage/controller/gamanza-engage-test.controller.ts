import { Public } from '@common/decorators/public-route.decorator';
import { Controller, Get } from '@nestjs/common';
import { GamanzaEngageService } from '../service/gamanza-engage.service';
import { randomUUID } from 'crypto';

// function delay(ms: number): Promise<void> {
//   return new Promise((resolve) => setTimeout(resolve, ms));
// }

@Public()
@Controller('gamanza/test')
export class GamanzaEngageTestController {
  constructor(private readonly gamanzaEngageApi: GamanzaEngageService) {}

  @Get()
  async test(): Promise<void> {
    const playerId = 'cm081mgyn0002ozmx9zatjj6b';

    await this.gamanzaEngageApi.sendMoneyTransactionEvent({
      amount: 10,
      bonusMoneyBalance: 0,
      realMoneyBalance: 20,
      currency: 'EUR',
      date: new Date().toISOString(),
      exchangeRate: 1,
      playerId,
      transactionId: randomUUID(),
      transactionType: 'DEPOSIT',
      transactionStatus: 'APPROVED',
    });

    // await this.gamanzaEngageApi.sendGameTransactionEvent({
    //   gameTransactionRound: [
    //     {
    //       playerId,
    //       transactionId,
    //       betAmount: 10,
    //       bonusMoneyAmount: 0,
    //       realMoneyAmount: 10,
    //       currency: 'EUR',
    //       realMoneyBalance: 100,
    //       bonusMoneyBalance: 0,
    //       date: new Date().toISOString(),
    //       exchangeRate: 1,
    //       transactionType: 'BET',
    //       transactionStatus: 'APPROVED',
    //       gameCategoryId: 'slot',
    //       gameCategoryName: 'Slot',
    //       gameName: 'Book of Ra',
    //       gameProviderName: 'Novomatic',
    //       gameProviderId: 'novomatic',
    //       gameId: 'book_of_ra',
    //       gameSessionId: randomUUID(),
    //     },
    //   ],
    // });

    // await delay(5000);

    // await this.gamanzaEngageApi.sendMoneyTransactionEvent({
    //   amount: 15,
    //   bonusMoneyBalance: 0,
    //   realMoneyBalance: 270,
    //   currency: 'EUR',
    //   date: new Date().toISOString(),
    //   exchangeRate: 1,
    //   playerId,
    //   transactionId,
    //   transactionType: 'WITHDRAW',
    //   transactionStatus: 'APPROVED',
    // });
  }
}
