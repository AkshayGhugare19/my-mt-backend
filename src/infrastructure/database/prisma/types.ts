import { Prisma } from '@prisma/client';
import {
  DynamicModelExtensionThis,
  InternalArgs,
} from '@prisma/client/runtime/library';
import { BetMetadata as BetMetadataType } from '@modules/bet/types';

export type TipBonusRepository = DynamicModelExtensionThis<
  Prisma.TypeMap<
    InternalArgs & {
      result: {};
      model: {};
      query: {};
      client: {};
    },
    Prisma.PrismaClientOptions
  >,
  'Reward',
  {
    result: {};
    model: {};
    query: {};
    client: {};
  },
  {}
>;
declare global {
  // eslint-disable-next-line no-unused-vars
  namespace PrismaJson {
    // eslint-disable-next-line no-unused-vars
    type BetMetadata = BetMetadataType;
  }
}
