import { createZodDto } from '@common/helper/create-zod-dto';
import { z } from 'zod';

export const WalletsSchema = z.object({
  depositTronPublicKey: z.string().optional(),
  withdrawTronPublicKey: z.string().optional(),
  feesTronPublicKey: z.string().optional(),
  depositSolanaublicKey: z.string().optional(),
  withdrawSolanaPublicKey: z.string().optional(),
  depositEthereumPublicKey: z.string().optional(),
  withdrawEthereumPublicKey: z.string().optional(),
  settlementPublicKey: z.string().optional(),
  ownWallet: z.string().optional(),
});

export class WalletsDto extends createZodDto(WalletsSchema) {
  constructor(data: WalletsDto) {
    super();
    Object.assign(this, data);
  }

  static from(data: WalletsDto): WalletsDto {
    return new WalletsDto(data);
  }
}
