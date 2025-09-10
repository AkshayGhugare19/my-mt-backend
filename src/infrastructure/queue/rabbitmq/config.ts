import { INestApplication, INestMicroservice } from '@nestjs/common';
import { RmqOptions } from '@nestjs/microservices';
import { BrokerQueues } from '@infrastructure/queue/rabbitmq/enum/queues';
import { formatQueueName } from '@infrastructure/queue/rabbitmq/utils/format-queue-name';

export abstract class RabbitMQMicroservice {
  static queues: Map<string, INestMicroservice> = new Map();

  static setup(app: INestApplication): void {
    const queueNames = Object.values(BrokerQueues).map((queue) =>
      formatQueueName(queue),
    );
    const queueProviders = queueNames.map((queue) => app.get(queue));
    queueProviders.forEach((queue) => {
      const ms = app.connectMicroservice<RmqOptions>(queue);
      this.queues.set(queue.options.queue, ms);
    });
  }
}
