import { Global, Module } from '@nestjs/common';
import { InteractionGateService } from './interaction-gate.service.js';

@Global()
@Module({
  providers: [InteractionGateService],
  exports: [InteractionGateService],
})
export class InteractionGateModule {}
