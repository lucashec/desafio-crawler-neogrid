import { Module } from '@nestjs/common';
import { InputService } from './input.service';
import { QueueModule } from 'src/queue/queue.module';

@Module({
  imports: [QueueModule],
  providers: [InputService],
  exports: [InputService],
})
export class InputModule {}
