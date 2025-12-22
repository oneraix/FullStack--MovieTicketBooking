import { Module } from '@nestjs/common';
import { SeatTypesService } from './seat_types.service';
import { SeatTypesController } from './seat_types.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SeatTypesController],
  providers: [SeatTypesService,PrismaService],
})
export class SeatTypesModule {}
