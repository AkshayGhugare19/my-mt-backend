import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const ParametersSchema = z.object({
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
});

export class ParametersDto extends createZodDto(ParametersSchema) {
  constructor(data: ParametersDto) {
    super();
    Object.assign(this, data);
  }

  static from(data: ParametersDto): ParametersDto {
    return new ParametersDto(data);
  }
}
