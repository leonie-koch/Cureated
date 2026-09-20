import { Controller, Get } from '@nestjs/common';
import { BlsFoodsService } from './bls-foods.service.js';

@Controller('bls-foods')
export class BlsFoodsController {
  constructor(private readonly blsFoodsService: BlsFoodsService) {}

  // Returns the full list (name + food group only) for client-side search,
  // rather than a server-side search endpoint — at ~7,140 rows this is a
  // small, one-time payload and keeps matching instant with no debounce.
  @Get()
  findAll() {
    return this.blsFoodsService.findAll();
  }
}
