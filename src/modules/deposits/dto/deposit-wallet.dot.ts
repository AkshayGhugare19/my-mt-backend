import { createZodDto } from '@common/helper/create-zod-dto';
import { DepositWallet } from '@prisma/client';
import { z } from 'zod';

export const DepositWalletSchema = z.object({
  wallet: z.string(),
  blockchain: z.number(),
});

export class DepositWalletDto extends createZodDto(DepositWalletSchema) {
  constructor(data: Partial<DepositWalletDto>) {
    super();

    Object.assign(this, data);
  }

  static from(data: DepositWallet): DepositWalletDto {
    const dto = DepositWalletDto.createSafe(data);

    return new DepositWalletDto(dto);
  }
}
