import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { ENV } from '@common/env';
import { QueuesDefinition } from '@infrastructure/queue/bull/queue-definition';
import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export abstract class BullBoardConfigService {
  static setup(app: INestApplication): void {
    if (process.env.NODE_ENV === 'production') return;
    const queues = Object.values(QueuesDefinition).map((queue) => queue.name);

    const mappedQueues = queues.map((queue) => app.get('BullQueue_' + queue));

    const queueAdapters = mappedQueues.map((queue) => new BullAdapter(queue));
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/bull-board');
    createBullBoard({
      queues: queueAdapters,
      serverAdapter,
    });

    app.use('/admin/bull-board', serverAdapter.getRouter());
    const configService = app.get(ConfigService);
    Logger.log(
      `Bull Board initialized on: ${configService.get(ENV.API_BASE_URL)}/admin/bull-board`,
      BullBoardConfigService.name,
    );
  }
}
