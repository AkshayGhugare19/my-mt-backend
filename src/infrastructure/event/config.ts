import { EventEmitterModuleOptions } from '@nestjs/event-emitter/dist/interfaces';

export const eventEmitterConfig: EventEmitterModuleOptions = {
  wildcard: true,
  delimiter: '.',
  maxListeners: 15,
  verboseMemoryLeak: true,
};
