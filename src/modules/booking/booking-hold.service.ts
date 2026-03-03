import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { BookingHoldCache } from "./types/booking-hold-cache";
import { HOLD_TTL_SECONDS } from "src/common/constant/app.constant";
import { IOREDIS_CLIENT } from 'src/common/redis/redis.provider';


@Injectable()
export class BookingHoldService {
    private readonly SAFE_RELEASE_LUA_SCRIPT = `
    if redis.call("get",KEYS[1]) == ARGV[1] then
      return redis.call("del",KEYS[1])
    else
      return 0
    end
    `;

    constructor (
        @Inject(IOREDIS_CLIENT) private readonly redisClient: Redis,
    ){}

    private getSeatHoldKey(showtimeId:string, seatId:number) {
        return `hold:${showtimeId}:${seatId}`;
    }

    private getBookingHoldKey(bookingId:string) {
        return `booking:${bookingId}:hold`;
    }

    private async cacheSetJSON(key:string, value:unknown, ttlSeconds:number){
        await this.redisClient.set(key, JSON.stringify(value),`EX`, ttlSeconds);
        
    }

    private async cacheGetJSON <T = unknown>(key:string): Promise<T | undefined >{
        const raw = await this.redisClient.get(key);
        return raw ? (JSON.parse(raw) as T): undefined;
    }

    async cacheBookingHold(bookingId: string, data: BookingHoldCache){
        const ttl = Number(HOLD_TTL_SECONDS)||300;
        await this.cacheSetJSON(this.getBookingHoldKey(bookingId), data, ttl);
    }

    async getBookingHold(bookingId: string ): Promise<BookingHoldCache | undefined> {
        return this.cacheGetJSON<BookingHoldCache>(this.getBookingHoldKey(bookingId));
    }

    async deleteBookingHold(bookingId: string) {
        await this.redisClient.del(this.getBookingHoldKey(bookingId));
    }

    async holdSeats(showtimeId: string, seatIds:number[], userId: string){
        const ttl = Number(HOLD_TTL_SECONDS) || 300;
        const pipe = this.redisClient.multi();
        for(const seatId of seatIds){
            const key = this.getSeatHoldKey(showtimeId, seatId);
            (pipe as any).call('SET', key, userId, 'NX', 'EX', String(ttl));
        }

        const results = await pipe.exec();
        const failed = results?.some((r) => r == null || r[1] !== 'OK');
        if(failed){
            await this.releaseSeats(showtimeId, seatIds, userId);
            throw new BadRequestException('Một hoặc nhiều ghế đang được giữ bởi người khác');
        }
    }

    async releaseSeats(showtimeId: string, seatIds: number[], userId: string){
        const pipe = this.redisClient.multi();
        for(const seatId of seatIds){
            const key = this.getSeatHoldKey(showtimeId, seatId);
            (pipe as any).eval(this.SAFE_RELEASE_LUA_SCRIPT, 1, key, userId);
        }
        await pipe.exec();
    }

    async releaseBookingHold(bookingId:string){
        const hold = await this.getBookingHold(bookingId);
        if (!hold) return;

        await this.releaseSeats(hold.showtimeId, hold.seatIds, hold.userId);
        await this.deleteBookingHold(bookingId);
    }
}