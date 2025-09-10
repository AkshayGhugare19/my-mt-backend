import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { CountryProvidersBlacklistService } from './service/country-providers-blacklist.service';
import { CountryProvidersBlacklistAdminController } from './controller/country-providers-blacklist-admin.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [PrismaModule, HttpModule.register({})],
  controllers: [CountryProvidersBlacklistAdminController],
  providers: [CountryProvidersBlacklistService],
  exports: [CountryProvidersBlacklistService],
})
export class CountryProvidersBlacklistModule {}
