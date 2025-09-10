import { Role, Roles } from '@modules/role/enum/role.enum';
import {
  StatisticsTarget,
  StatisticsTargets,
} from '@modules/statistics/enum/statistics-target.enum';

export function convertStatisticsTargetToRole(
  target: StatisticsTarget,
): Role[] {
  switch (target) {
    case StatisticsTargets.USER:
      return [Roles.USER];
    case StatisticsTargets.VIP:
      return [Roles.VIP_USER];
    default:
      return [Roles.USER, Roles.VIP_USER];
  }
}
