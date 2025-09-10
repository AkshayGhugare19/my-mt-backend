import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { AlchemyApi } from './api';

@Module({
  imports: [HttpModule],
  providers: [AlchemyApi],
  exports: [AlchemyApi],
})
export class AlchemyModule {}
