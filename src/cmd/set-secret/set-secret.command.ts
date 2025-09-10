import { SecretsService } from '@infrastructure/secrets/secrets.service';
import { Logger } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';

interface SetSecretCommandOptions {
  secret: string;
  value: string;
}

@Command({
  name: 'set-secret',
})
export class SetSecretCommand extends CommandRunner {
  private readonly _logger = new Logger(SetSecretCommand.name);

  constructor(private readonly secretsService: SecretsService) {
    super();
  }

  async run(
    _params: string[],
    options: SetSecretCommandOptions,
  ): Promise<void> {
    this._logger.log(`Setting secret ${options.secret} to ${options.value}`);

    await this.secretsService.setSecret(options.secret, options.value);

    process.exit(0);
  }

  @Option({
    flags: '-s, --secret [string]',
    description: 'The secret to set',
    required: true,
  })
  parseSecret(val: string): string {
    return val;
  }

  @Option({
    flags: '-v, --value [string]',
    description: 'The value to set',
    required: true,
  })
  parseValue(val: string): string {
    return val;
  }
}
