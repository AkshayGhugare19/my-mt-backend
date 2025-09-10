import { Injectable, Logger } from '@nestjs/common';
import { SlotegratorService } from '../service/slotegrator.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SlotegratorImporterCron {
  private readonly _logger = new Logger(SlotegratorImporterCron.name);
  constructor(private readonly slotegratorService: SlotegratorService) {}

  @Cron(CronExpression.EVERY_2_HOURS)
  async update(): Promise<void> {
    this._logger.log('updating Slotegrator games');
    await this.slotegratorService.importGames();
  }
}
