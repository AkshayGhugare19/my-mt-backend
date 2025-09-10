import { PartialUndefined } from '@common/types';
import { Permission } from '@modules/permission/enum/permission.enum';

export interface VerifyPermissions {
  sanitizeFieldsByPermissions(
    permissions: Permission[],
  ): PartialUndefined<any>;
}
