import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConditionsModule } from './conditions/conditions.module.js';
import { IngredientsModule } from './ingredients/ingredients.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { PropertiesModule } from './properties/properties.module.js';
import { RecipesModule } from './recipes/recipes.module.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    PrismaModule,
    RecipesModule,
    IngredientsModule,
    ConditionsModule,
    PropertiesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
