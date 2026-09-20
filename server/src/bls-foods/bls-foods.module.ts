import { Module } from '@nestjs/common';
import { BlsFoodsController } from './bls-foods.controller.js';
import { BlsFoodsService } from './bls-foods.service.js';

@Module({
  controllers: [BlsFoodsController],
  providers: [BlsFoodsService],
  exports: [BlsFoodsService],
})
export class BlsFoodsModule {}
