import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "src/modules/prisma/prisma.service";
import { CreateTicketPriceDto } from "./dto/create-ticket_price.dto";
import { start } from "repl";

@Injectable()
export class TicketPricesService {
    constructor(
        private readonly prisma: PrismaService
    ) {}

    //giữ nguyên time dùng epoch date
    private toTimeDate(timeStr: string): Date {
        return new Date(`1970-01-01T${timeStr}.000z`);
    }

    async create(dto:CreateTicketPriceDto, userId: string) {
        const time_start = this.toTimeDate(dto.time_start);
        const time_end = this.toTimeDate(dto.time_end);
        if (time_end <= time_start){
            throw new BadRequestException('time_end phải lớn hơn time_start');
        }
        return this.prisma.ticket_prices.create({
            data:{
                day_of_week: dto.day_of_week,
                time_start,
                time_end,
                base_price: dto.base_price,
                created_by: userId
            },
        });
    }

    findAll() {
        return this.prisma.ticket_prices.findMany({
            where: { is_deleted: false },
            orderBy: [{ day_of_week: 'asc' }, { time_start: 'asc' }],
        });
    }

    async findOne(id: number) {
        const item = await this.prisma.ticket_prices.findFirst({
            where:{
                id,
                is_deleted: false
            },
        });
        if(!item){
            throw new BadRequestException('Không tìm thấy ticket price');
        
        }
        return item;
    }

    async update(id: number, dto: CreateTicketPriceDto, userId: string) {
        await this.findOne(id);

        const data: any = {
            update_by: userId,
            updated_at: new Date(),
        };
        if(dto.day_of_week !== undefined) data.day_of_week = dto.day_of_week;
        if (dto.base_price !== undefined) data.base_price = dto.base_price;
        if (dto.time_start !== undefined) data.time_start = this.toTimeDate(dto.time_start);
        if (dto.time_end !== undefined) data.time_end = this.toTimeDate(dto.time_end);
        return this.prisma.ticket_prices.update({
            where: { id },
            data,
        });
    }

    async softDelete(id: number, userId: string) {
        await this.prisma.ticket_prices.update({
            where:{id},
            data:{
                is_deleted: true,
                deleted_by: userId,
                deleted_at: new Date(),
            }
        })
    }
}