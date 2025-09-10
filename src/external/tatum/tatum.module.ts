import { Module } from '@nestjs/common';
import { TatumApi } from './api';
import { HttpModule } from '@nestjs/axios';

@Module({ imports: [HttpModule], providers: [TatumApi], exports: [TatumApi] })
export class TatumModule {}
