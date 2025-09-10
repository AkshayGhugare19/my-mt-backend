import { Injectable, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { RealtimeService } from '@infrastructure/realtime/realtime.service';
import { BalanceService } from '@modules/balance/service/balance.service';
import { decimalToNumber } from '@utils/decimal-do-number';
import { OnEvents } from '@common/decorators/on-events.decorator';

@Injectable()
export class NotificationsEvents {
  private readonly _logger = new Logger(NotificationsEvents.name);

  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly realtimeService: RealtimeService,
    private readonly balanceService: BalanceService,
  ) {}

  @OnEvents(['transaction.*', 'bet.*'])
  async handleBalanceUpdate(event: { userId?: string }): Promise<void> {
    this._logger.debug('notifications event handler called', event);

    if (!event.userId) {
      return;
    }

    const balance = await this.balanceService.getBalance(event.userId);
    if (!balance) {
      return;
    }

    await this.realtimeService.pushMessageToUser(event.userId, {
      type: 'balance',
      newAmount: decimalToNumber(balance),
    });
  }

  // TODO: implement notifications here
}
