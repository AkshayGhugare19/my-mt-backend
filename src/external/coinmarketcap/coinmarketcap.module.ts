import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { CoinmarketcapApi } from './api';

@Module({
  imports: [HttpModule],
  providers: [CoinmarketcapApi],
  exports: [CoinmarketcapApi],
})
export class CoinmarketcapModule {}
