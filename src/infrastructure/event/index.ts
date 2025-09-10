import { EventService } from '@infrastructure/event/service/event.service';
import { EventQueueConfig } from '@infrastructure/queue/rabbitmq/client-config';
import { BrokerQueues } from '@infrastructure/queue/rabbitmq/enum/queues';
import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ClientProxy,
  ClientProxyFactory,
  RmqOptions,
} from '@nestjs/microservices';

const betEventClientProvider: Provider = {
  provide: BrokerQueues.EVENT_QUEUE,
  useFactory: (configService: ConfigService): ClientProxy => {
    return ClientProxyFactory.create({
      ...EventQueueConfig(configService, { options: { noAck: true } }),
    } as RmqOptions);
  },
  inject: [ConfigService],
};

@Global()
@Module({
  imports: [],
  providers: [betEventClientProvider, EventService],
  exports: [EventService, betEventClientProvider],
})
export class EventModule {}
