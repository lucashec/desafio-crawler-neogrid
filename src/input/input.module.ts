import { Module } from '@nestjs/common';
import { InputService } from './input.service';
import { QueueModule } from 'src/queue/queue.module';
import { InputController } from './input.controller';

@Module({
  imports: [QueueModule],
  providers: [InputService],
  exports: [InputService],
  controllers: [InputController],
})
export class InputModule {}
