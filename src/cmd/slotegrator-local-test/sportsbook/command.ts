import { Command, CommandRunner } from 'nest-commander';
import { data } from './shared/data';
import {
  SlotegratorSportsbookBetCommand,
  SlotegratorSportsbookAllCommand,
  SlotegratorSportsbookCashoutCommand,
  SlotegratorSportsbookLoseCommand,
  SlotegratorSportsbookRollbackCommand,
  SlotegratorSportsbookWinCommand,
  SlotegratorSportsbookRefundCommand,
} from './sub-commands';
import { SlotegratorSportsbookCommitCommand } from 'src/cmd/slotegrator-local-test/sportsbook/sub-commands/commit.command';

export type OperationTypes = keyof typeof data | 'all';
export const OPERATION_OPTIONS: OperationTypes[] = [
  ...(Object.keys(data) as OperationTypes[]),
  'all',
];

export type OperationOptions = {
  userId: string;
  verbose: boolean;
  amount: number;
};

@Command({
  name: 'test-sportsbook',
  description: 'Test the sportsbook with predefined data',
  arguments: '[operation]',
  argsDescription: {
    operation: `The operation to test. Available operations: ${OPERATION_OPTIONS.join(
      '|',
    )}`,
  },
  subCommands: [
    SlotegratorSportsbookBetCommand,
    SlotegratorSportsbookLoseCommand,
    SlotegratorSportsbookWinCommand,
    SlotegratorSportsbookCashoutCommand,
    SlotegratorSportsbookRollbackCommand,
    SlotegratorSportsbookAllCommand,
    SlotegratorSportsbookRefundCommand,
    SlotegratorSportsbookCommitCommand,
  ],
})
export class SlotegratorSportsbookTestCommand extends CommandRunner {
  async run(passedParams: string[], options: OperationOptions): Promise<void> {
    if (passedParams.length !== 1) {
      throw new Error('Invalid operation');
    }

    const operation = passedParams[0] as OperationTypes;

    if (!OPERATION_OPTIONS.includes(operation)) {
      throw new Error('Invalid operation');
    }
  }
}
