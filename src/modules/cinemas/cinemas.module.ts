import { Module } from '@nestjs/common';
import { CinemasService } from './cinemas.service';
import { CinemasController } from './cinemas.controller';
import { Prisma } from 'generated/prisma';
import { PrismaService } from '../prisma/prisma.service';
import { RolesGuard } from 'src/common/guard/roles.guard';

@Module({
  controllers: [CinemasController],
  providers: [CinemasService, PrismaService,RolesGuard],
})
export class CinemasModule {}
