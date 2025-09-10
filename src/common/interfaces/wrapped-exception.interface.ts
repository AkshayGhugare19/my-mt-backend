import { HttpException } from '@nestjs/common';

export interface WrappedException {
  getException(): HttpException | Error;
  getBalance(): number | undefined;
}
