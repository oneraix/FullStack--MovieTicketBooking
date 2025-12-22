import { Module } from '@nestjs/common';

import { ShowTimesController } from './show_times.controller';
import { ShowtimesService } from './show_times.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ShowTimesController],
  providers: [ShowtimesService,PrismaService],
})
export class ShowTimesModule {}
