import { Module } from '@nestjs/common';
import { ConstraintsService } from './constraints.service';

@Module({
  providers: [ConstraintsService],
  exports: [ConstraintsService],
})
export class ConstraintsModule {}
