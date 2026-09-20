import { Module } from '@nestjs/common';
import { ConditionsController } from './conditions.controller.js';
import { ConditionsService } from './conditions.service.js';

@Module({
  controllers: [ConditionsController],
  providers: [ConditionsService],
})
export class ConditionsModule {}
