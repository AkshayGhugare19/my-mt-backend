import { BullModuleOptions } from '@nestjs/bull';
import { BULL_QUEUE } from './constants/queue';
import { defaultJobConfig } from '@infrastructure/queue/bull/queue-config';

const queueNames = Object.entries(BULL_QUEUE).reduce(
  (acc, [key, value]) => {
    acc[value] = key as keyof typeof BULL_QUEUE;
    return acc;
  },
  {} as Record<
    (typeof BULL_QUEUE)[keyof typeof BULL_QUEUE],
    keyof typeof BULL_QUEUE
  >,
);

const queuesConfig: BullModuleOptions[] = [
  {
    name: BULL_QUEUE.MEDIA_QUEUE,
    defaultJobOptions: defaultJobConfig,
  },
  {
    name: BULL_QUEUE.MAILS_QUEUE,
    defaultJobOptions: defaultJobConfig,
  },
  {
    name: BULL_QUEUE.DEPOSITS_QUEUE,
    defaultJobOptions: defaultJobConfig,
  },
  {
    name: BULL_QUEUE.WITHDRAW_QUEUE,
    defaultJobOptions: defaultJobConfig,
  },
  {
    name: BULL_QUEUE.BONUS_QUEUE,
    defaultJobOptions: defaultJobConfig,
  },
  {
    name: BULL_QUEUE.SPORTSBOOK_BETS_QUEUE,
    defaultJobOptions: defaultJobConfig,
  },
  {
    name: BULL_QUEUE.GAMANZA_QUEUE,
    defaultJobOptions: defaultJobConfig,
  },
  {
    name: BULL_QUEUE.POKER_CODE_DISTRIBUTION_QUEUE,
    defaultJobOptions: defaultJobConfig,
  },
  {
    name: BULL_QUEUE.WAGERING_BET_QUEUE,
    defaultJobOptions: defaultJobConfig,
  },
  {
    name: BULL_QUEUE.WAGERING_PROGRESS_QUEUE,
    defaultJobOptions: defaultJobConfig,
  },
];

if (Object.keys(queueNames).length !== queuesConfig.length) {
  throw new Error('Queue Not defined in queuesConfig');
}

export const QueuesDefinition = queuesConfig.reduce(
  (acc, curr) => {
    if (!curr.name) throw new Error('Queue name is required');

    acc[queueNames[curr.name as (typeof BULL_QUEUE)[keyof typeof BULL_QUEUE]]] =
      curr;
    return acc;
  },
  {} as Record<keyof typeof BULL_QUEUE, BullModuleOptions>,
);
