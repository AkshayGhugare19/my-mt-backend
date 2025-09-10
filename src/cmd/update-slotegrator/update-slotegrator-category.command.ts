import { SlotegratorService } from '@modules/betting-providers/slotegrator/service/slotegrator.service';
import { Logger } from '@nestjs/common';
import { Command, CommandRunner } from 'nest-commander';

@Command({
  name: 'update-slotegrator-category',
})
export class UpdateSlotegratorCategoryCommand extends CommandRunner {
  private readonly _logger = new Logger(UpdateSlotegratorCategoryCommand.name);

  constructor(private readonly slotegratorService: SlotegratorService) {
    super();
  }

  async run(): Promise<void> {
    this._logger.log('Updating slotegrator entities');
    await this.slotegratorService.populateGameCategory();
    await this.slotegratorService.addGameCategory();
    this._logger.log('Updating completed');

    process.exit(0);
  }
}
