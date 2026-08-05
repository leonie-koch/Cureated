import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ConditionsService } from './conditions.service';
import { CreateConditionDto } from './dto/create-condition.dto';
import { SetConditionWeightsDto } from './dto/set-condition-weights.dto';
import { UpdateConditionDto } from './dto/update-condition.dto';

@Controller('conditions')
export class ConditionsController {
  constructor(private readonly conditionsService: ConditionsService) {}

  @Post()
  create(@Body() createConditionDto: CreateConditionDto) {
    return this.conditionsService.create(createConditionDto);
  }

  @Get()
  findAll() {
    return this.conditionsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.conditionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateConditionDto: UpdateConditionDto,
  ) {
    return this.conditionsService.update(id, updateConditionDto);
  }

  @Put(':id/weights')
  setWeights(
    @Param('id') id: string,
    @Body() setConditionWeightsDto: SetConditionWeightsDto,
  ) {
    return this.conditionsService.setWeights(id, setConditionWeightsDto);
  }

  @Get(':id/ranked-recipes')
  getRankedRecipes(@Param('id') id: string, @Query('limit') limit?: string) {
    return this.conditionsService.getRankedRecipes(
      id,
      limit !== undefined ? Number(limit) : undefined,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.conditionsService.remove(id);
  }
}
