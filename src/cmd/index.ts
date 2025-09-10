import { Module } from '@nestjs/common';
import { InvalidatePermissionCacheModule } from './invalidate-permission-cache/invalidate-permission-cache.module';
import { SeedModule } from './seed/seed.module';
import { UpdateSlotegratorModule } from './update-slotegrator/update-slotegrator.module';
import { SetSecretModule } from './set-secret/set-secret.module';

@Module({
  imports: [
    UpdateSlotegratorModule,
    InvalidatePermissionCacheModule,
    SeedModule,
    SetSecretModule,
  ],
})
export class CommandModule {}
