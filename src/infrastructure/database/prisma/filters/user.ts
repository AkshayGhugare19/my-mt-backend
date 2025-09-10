import { Prisma } from '@prisma/client';

/**
 * Search for a user by playerTag, nickname, email, id or wallet
 * @param userIdentifier
 * @returns
 */
export const userSearchSelector = (
  userIdentifier: string,
):
  | (Prisma.Without<Prisma.UserScalarRelationFilter, Prisma.UserWhereInput> &
      Prisma.UserWhereInput)
  | (Prisma.Without<Prisma.UserWhereInput, Prisma.UserScalarRelationFilter> &
      Prisma.UserScalarRelationFilter) => ({
  OR: [
    {
      playerTag: {
        contains: userIdentifier,
        mode: 'insensitive',
      },
    },
    {
      nickname: {
        contains: userIdentifier,
        mode: 'insensitive',
      },
    },
    {
      email: {
        contains: userIdentifier,
        mode: 'insensitive',
      },
    },
    {
      id: {
        contains: userIdentifier,
        mode: 'insensitive',
      },
    },
    {
      wallet: {
        contains: userIdentifier,
        mode: 'insensitive',
      },
    },
  ],
});
