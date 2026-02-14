import { Module } from '@nestjs/common';
import { ConstraintsService } from './constraints.service.js';
import { ConstraintsController } from './constraints.controller.js';

@Module({
  controllers: [ConstraintsController],
  providers: [ConstraintsService],
  exports: [ConstraintsService],
})
export class ConstraintsModule {}
