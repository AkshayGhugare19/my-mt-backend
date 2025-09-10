import { applyDecorators } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

export const OnEvents = (events: string[]): MethodDecorator =>
  applyDecorators(...events.map((e) => OnEvent(e)));
