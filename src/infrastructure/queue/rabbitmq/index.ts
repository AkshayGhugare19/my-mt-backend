import {
  BetEventQueueConfig,
  EventQueueConfig,
} from '@infrastructure/queue/rabbitmq/client-config';
import { BrokerQueues } from '@infrastructure/queue/rabbitmq/enum/queues';
import { formatQueueName } from '@infrastructure/queue/rabbitmq/utils/format-queue-name';
import { Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const queues: Provider[] = [
  {
    provide: formatQueueName(BrokerQueues.BET_EVENT_QUEUE),
    useFactory: (configService: ConfigService) =>
      BetEventQueueConfig(configService),
    inject: [ConfigService],
  },
  {
    provide: formatQueueName(BrokerQueues.EVENT_QUEUE),
    useFactory: (configService: ConfigService) =>
      EventQueueConfig(configService),
    inject: [ConfigService],
  },
];

@Module({
  imports: [],
  providers: queues,
  exports: queues,
})
export class RabbitMQModule {}
