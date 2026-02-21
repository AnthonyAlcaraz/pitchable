import { Module, Global } from '@nestjs/common';
import { EventsGateway } from './events.gateway.js';
import { EventStreamService } from './event-stream.service.js';

@Global()
@Module({
  providers: [EventsGateway, EventStreamService],
  exports: [EventsGateway, EventStreamService],
})
export class EventsModule {}
