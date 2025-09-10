import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '@modules/user/user.module';
import { HttpModule } from '@nestjs/axios';
import { GoogleController } from './controller/google.controller';
import { GoogleService } from './service/google.service';

@Module({
  imports: [HttpModule, ConfigModule, UserModule],
  providers: [GoogleService],
  exports: [GoogleService],
  controllers: [GoogleController],
})
export class GoogleModule {}
