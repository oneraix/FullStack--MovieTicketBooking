import { Module } from '@nestjs/common';
import { ScreenTypesService } from './screen_types.service';
import { ScreenTypesController } from './screen_types.controller';

@Module({
  controllers: [ScreenTypesController],
  providers: [ScreenTypesService],
})
export class ScreenTypesModule {}
