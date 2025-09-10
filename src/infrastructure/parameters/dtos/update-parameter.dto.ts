import { createZodDto } from '@anatine/zod-nestjs';
import { ZodDto } from '@common/decorators/transform-dto.decorator';
import { z } from 'zod';

export const UpdateParametersSchema = z.object({
  withdrawalTronWalletAlertLevel: z.number().optional(),
  withdrawalTronUsdtWalletAlertLevel: z.number().optional(),
  withdrawalTronUsdcWalletAlertLevel: z.number().optional(),
  feesTronWalletAlertLevel: z.number().optional(),
  withdrawalSolanaWalletAlertLevel: z.number().optional(),
  withdrawalSolanaUsdtWalletAlertLevel: z.number().optional(),
  withdrawalSolanaUsdcWalletAlertLevel: z.number().optional(),
  feesSolanaWalletAlertLevel: z.number().optional(),
  withdrawalEthWalletAlertLevel: z.number().optional(),
  withdrawalEthUsdtWalletAlertLevel: z.number().optional(),
  withdrawalEthUsdcWalletAlertLevel: z.number().optional(),
  twoFactorAuthenticationCode: z.string(),
});

@ZodDto()
export class UpdateParametersDto extends createZodDto(UpdateParametersSchema) {
  constructor(data: UpdateParametersDto) {
    super();
    Object.assign(this, data);
  }
}
