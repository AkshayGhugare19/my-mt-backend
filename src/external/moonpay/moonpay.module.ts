import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MoonPayController } from './controller/moonpay.controller';
import { MoonPayService } from './service/moonpay.service';
import { UserModule } from '@modules/user/user.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule, ConfigModule, UserModule],
  providers: [MoonPayService],
  exports: [MoonPayService],
  controllers: [MoonPayController],
})
export class MoonPayModule {}
