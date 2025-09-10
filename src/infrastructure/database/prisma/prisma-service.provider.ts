import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { Provider } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

export const PrismaServiceProvider: Provider = {
  provide: PrismaService,
  useFactory: (clsService: ClsService) => {
    return new PrismaService(clsService);
  },
  inject: [ClsService],
};
