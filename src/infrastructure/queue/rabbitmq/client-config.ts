import { ONE_DAY_IN_MS } from '@common/constants';
import { ENV } from '@common/env';
import { BrokerQueues } from '@infrastructure/queue/rabbitmq/enum/queues';
import { ConfigService } from '@nestjs/config';
import { RmqOptions, Transport } from '@nestjs/microservices';

const QueueConfig: (options?: RmqOptions['options']) => RmqOptions = (
  options: RmqOptions['options'] = {},
) => {
  return {
    transport: Transport.RMQ,
    options: {
      queue: BrokerQueues.BET_EVENT_QUEUE,
      urls: options?.urls || [],
      noAck: false,
      persistent: true,
      queueOptions: {
        autoDelete: false,
        durable: true,
        ...(options?.queueOptions || {}),
      },
      ...(options || {}),
    },
  };
};

export const BetEventQueueConfig: (
  configService: ConfigService,
  options?: RmqOptions,
) => RmqOptions = (configService: ConfigService, options: RmqOptions = {}) => {
  const url = configService.getOrThrow<string>(ENV.RABBITMQ_URL);
  return QueueConfig({
    queue: BrokerQueues.BET_EVENT_QUEUE,
    urls: [url],
    queueOptions: {
      messageTtl: ONE_DAY_IN_MS * 4,
      deadLetterExchange: '',
      deadLetterRoutingKey: `${BrokerQueues.BET_EVENT_QUEUE}_FAILURE`,
      maxLength: 1_000_000,
      ...(options?.options?.queueOptions || {}),
    },
    ...(options.options || {}),
  });
};

export const EventQueueConfig: (
  configService: ConfigService,
  options?: RmqOptions,
) => RmqOptions = (configService: ConfigService, options: RmqOptions = {}) => {
  const url = configService.getOrThrow<string>(ENV.RABBITMQ_URL);
  return QueueConfig({
    queue: BrokerQueues.EVENT_QUEUE,
    urls: [url],
    queueOptions: {
      messageTtl: ONE_DAY_IN_MS * 4,
      deadLetterExchange: '',
      deadLetterRoutingKey: `${BrokerQueues.EVENT_QUEUE}_FAILURE`,
      maxLength: 1_000_000,
      ...(options?.options?.queueOptions || {}),
    },
    ...(options.options || {}),
  });
};
