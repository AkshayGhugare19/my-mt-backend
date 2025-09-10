import { Module } from '@nestjs/common';
import { PrismaModule } from '@infrastructure/database/prisma/prisma.module';
import { SeedCommand } from './seed.command';

@Module({
  imports: [PrismaModule],
  providers: [SeedCommand],
  exports: [SeedCommand],
})
export class SeedModule { }
