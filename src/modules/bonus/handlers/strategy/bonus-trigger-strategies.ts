import { AdminManualProducerStrategy } from '@modules/bonus/handlers/strategy/producer/admin-manual-producer.strategy';
import { BetSettlementProgressStrategy } from '@modules/bonus/handlers/strategy/progress/bet-settlement-progress.strategy';
import { DepositProducerStrategy } from '@modules/bonus/handlers/strategy/producer/deposit-producer.strategy';
import { Injectable } from '@nestjs/common';
import { ProducerStrategy } from '@modules/bonus/handlers/strategy/strategy';
import { BonusTriggerConfigType, BonusTriggerType } from '@modules/bonus/enum';

@Injectable()
export class BonusTriggerStrategies {
  private readonly customStrategies: Map<
    `${BonusTriggerType}-${BonusTriggerConfigType}`,
    ProducerStrategy
  > = new Map();

  constructor(
    private readonly _adminManualProducerStrategy: AdminManualProducerStrategy,
    private readonly _depositProducerStrategy: DepositProducerStrategy,
    private readonly _betSettlementProgressStrategy: BetSettlementProgressStrategy,
  ) {}

  get adminManualProducerStrategy(): AdminManualProducerStrategy {
    return this._adminManualProducerStrategy;
  }

  get depositProducerStrategy(): DepositProducerStrategy {
    return this._depositProducerStrategy;
  }

  get betSettlementProgressStrategy(): BetSettlementProgressStrategy {
    return this._betSettlementProgressStrategy;
  }

  registerCustomStrategy(
    type: BonusTriggerConfigType,
    triggerType: BonusTriggerType,
    strategy: ProducerStrategy,
  ): void {
    if (this.customStrategies.has(`${triggerType}-${type}`)) {
      throw new Error(`Custom strategy for type ${type} already registered`);
    }
    this.customStrategies.set(`${triggerType}-${type}`, strategy);
  }

  getCustomStrategy(
    type: BonusTriggerConfigType,
    triggerType: BonusTriggerType,
  ): ProducerStrategy | null {
    const strategy = this.customStrategies.get(`${triggerType}-${type}`);
    return strategy ?? null;
  }
}
