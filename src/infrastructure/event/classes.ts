import { Decimal } from '@prisma/client/runtime/library';

export class UserRegisterEvent {
  playerTag: string;
  nickname?: string;
  pmId?: number;
  pmBtag?: string;
  countryCode?: string;
  regDate?: Date;

  constructor(data: UserRegisterEvent) {
    Object.assign(this, data);
  }
}

export class UserLoginEvent {
  playerId: string;
  date: string;

  constructor(data: UserLoginEvent) {
    Object.assign(this, data);
  }
}

export class UserLogoutEvent {
  playerId: string;
  date: string;

  constructor(data: UserLogoutEvent) {
    Object.assign(this, data);
  }
}

export class UserActivationEvent {
  userId: string;
  promoCode?: string;

  constructor(data: UserActivationEvent) {
    Object.assign(this, data);
  }
}

export class EvenbetDebitEvent {
  userId: string;
  pmId?: number;
  pmBtag?: string;
  amount: Decimal;
  transactionId: string;
  previousBalance: Decimal | null;
  newBalance: Decimal | null;

  constructor(data: EvenbetDebitEvent) {
    Object.assign(this, data);
  }
}

export class EvenbetCreditEvent {
  userId: string;
  pmId?: number;
  pmBtag?: string;
  amount: Decimal;
  transactionId: string;
  previousBalance: Decimal | null;
  newBalance: Decimal | null;

  constructor(data: EvenbetDebitEvent) {
    Object.assign(this, data);
  }
}

export class BonusBalanceUpdateEvent {
  userId: string;
  bonusId: string;
  amount: Decimal;

  constructor(data: BonusBalanceUpdateEvent) {
    Object.assign(this, data);
  }
}
