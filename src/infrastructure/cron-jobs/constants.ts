export const CronJobs = {
  SEND_NEWSLETTER: 'cron.send-newsletter',
  SYNC: 'cron.sync',
  CANCEL_EXPIRED_RESERVATIONS: 'cron.cancel-expired-reservations',
} as const;

export const CronConfig = {
  DISABLE_NEWSLETTER: 'config:newsletter:isDisabled',
  DISABLE_SYNC: 'config:sync:isDisabled',
  DISABLE_AVAILABILITY_SYNC: 'config:sync:availability:isDisabled',
} as const;
