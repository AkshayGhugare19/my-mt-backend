import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { BinanceApi } from './api';

@Module({
  imports: [HttpModule],
  providers: [BinanceApi],
  exports: [BinanceApi],
})
export class BinanceModule {}
