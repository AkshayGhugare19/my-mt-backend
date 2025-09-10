/* eslint-disable dot-notation */
import { ConsoleLogger } from '@nestjs/common';
import { AssertionError } from 'assert';

export class SlotegratorLocalTestErrorHandler {
  constructor(private readonly logger: ConsoleLogger) {}

  catch(exception: Error): void {
    if (exception instanceof AssertionError) {
      const message = exception.message.split('\n');
      this.logger.error(message[0]);
      console.error(this.logger['colorize'](message[1], 'error'));
      console.error(this.logger['colorize'](message[2], 'error'));
      this.logger.error('Assertion Data:', 'Assertion Result');

      console.error(
        `Operator: ${this.logger['colorize'](exception.operator, 'error')}`,
      );
      console.error(
        `Actual: ${this.logger['colorize'](exception.actual as string, 'error')}`,
      );
      console.error(
        `Expected: ${this.logger['colorize'](
          exception.expected as string,
          'error',
        )}`,
      );
      this.logger.verbose(exception.stack);
    } else {
      this.logger.error(exception.message);
      this.logger.verbose(exception.stack);
    }
  }
}
