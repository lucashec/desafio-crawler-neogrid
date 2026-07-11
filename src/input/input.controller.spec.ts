import { Test, TestingModule } from '@nestjs/testing';
import { InputController } from './input.controller';

describe('InputController', () => {
  let controller: InputController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InputController],
    }).compile();

    controller = module.get<InputController>(InputController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
