import { Role } from '@modules/role/enum/role.enum';
import { UserWithBalance } from '@modules/user/types';

export type JwtPayload = {
  sub: string; // userId
  playerTag: string;
  role: Role;
  iat: number;
  exp: number;
  jti: string;
};

export type LoginResponse = {
  token: string | null;
  refreshToken: string | null;
  user: UserWithBalance;
};

export type TokenScopes = 'admin' | 'client';
