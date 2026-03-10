import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { Roles } from "src/common/decorator/role.decorator";
import { RolesGuard } from "src/common/guard/roles.guard";
import { ProtectGuard } from "src/modules/auth/protect/protect.guard";
import { TicketPricesService } from "./ticket_prices.service";
import { CreateTicketPriceDto } from "./dto/create-ticket_price.dto";
import { AuthUser } from "src/common/decorator/auth-user.decorator";

@UseGuards(ProtectGuard, RolesGuard)
@Roles('admin')
@Controller('ticket-prices')

export class TicketPricesController {
    constructor(
        private readonly service: TicketPricesService
    ) { }

    @Post()
    create(
        @Body() dto: CreateTicketPriceDto, 
        @AuthUser('sub') userId: string) {
        return this.service.create(dto, userId);
    }

    @Get()
    findAll() {
        return this.service.findAll();
    }

    @Get(':id')
    findOne(@Param('id', ParseIntPipe) id:number) {
        return this.service.findOne(id);
    }

    @Patch(':id')
    update(
        @Param('id', ParseIntPipe) id: number,
        @Body() dto: CreateTicketPriceDto, 
        @AuthUser('sub') userId: string) {
        return this.service.update(id, dto,userId);
    }

    @Delete(':id')
    remove(
        @Param('id', ParseIntPipe) id: number, 
        @AuthUser('sub') userId: string) {
        return this.service.softDelete(id, userId);
    }
}