import { BadRequestException, Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { BookingHoldCache } from "./types/booking-hold-cache";
//import { HOLD_TTL_SECONDS } from "src/common/constant/app.constant";
import { IOREDIS_CLIENT } from 'src/common/redis/redis.provider';
import redisConfig from "src/config/redis.config";
import { ConfigType } from "@nestjs/config";
import { randomUUID } from "crypto";


@Injectable()
export class BookingHoldService {
    private readonly SAFE_RELEASE_LUA_SCRIPT = `
    if redis.call("get",KEYS[1]) == ARGV[1] then
      return redis.call("del",KEYS[1])
    else
      return 0
    end
    `;

    constructor(
        @Inject(redisConfig.KEY)
        private readonly redisCfg: ConfigType<typeof redisConfig>,
        @Inject(IOREDIS_CLIENT) private readonly redisClient: Redis,
    ) { }

    private getSeatHoldKey(showtimeId: string, seatId: number) {
        return `hold:${showtimeId}:${seatId}`;
    }

    private getBookingHoldKey(bookingId: string) {
        return `booking:${bookingId}:hold`;
    }

    private async cacheSetJSON(key: string, value: unknown, ttlSeconds: number) {
        await this.redisClient.set(key, JSON.stringify(value), `EX`, ttlSeconds);

    }

    private async cacheGetJSON<T = unknown>(key: string): Promise<T | undefined> {
        const raw = await this.redisClient.get(key);
        return raw ? (JSON.parse(raw) as T) : undefined;
    }

    async cacheBookingHold(bookingId: string, data: BookingHoldCache) {
        const ttl = this.redisCfg.hold_ttl;
        await this.cacheSetJSON(this.getBookingHoldKey(bookingId), data, ttl);
    }

    async getBookingHold(bookingId: string): Promise<BookingHoldCache | undefined> {
        return this.cacheGetJSON<BookingHoldCache>(this.getBookingHoldKey(bookingId));
    }

    async deleteBookingHold(bookingId: string) {
        await this.redisClient.del(this.getBookingHoldKey(bookingId));
    }

    // Trả về lockValue nếu acquired, null nếu khôn
    async acquireBookingLock(userId: string): Promise<string | null> {
        const key = `booking_create_lock:${userId}`;
        const lockValue = randomUUID();
        // NX = chỉ set nếu chưa có, EX = tự hết hạn sau 10s
        const result = await (this.redisClient as any).call('SET', key, lockValue, 'NX', 'EX', '10');
        return result === 'OK' ? lockValue : null;
    }

    //value khớp thì mới cho release
    async releaseBookingLock(userId: string, lockValue: string): Promise<void> {
        const key = `booking_create_lock:${userId}`;
        await this.redisClient.eval(this.SAFE_RELEASE_LUA_SCRIPT,1,key, lockValue);
    }

    async holdSeats(showtimeId: string, seatIds: number[], userId: string) {
        const ttl = this.redisCfg.hold_ttl;
        const pipe = this.redisClient.multi();
        for (const seatId of seatIds) {
            const key = this.getSeatHoldKey(showtimeId, seatId);
            (pipe as any).call('SET', key, userId, 'NX', 'EX', String(ttl));
        }

        const results = await pipe.exec();
        const failed = results?.some((r) => r == null || r[1] !== 'OK');
        if (failed) {
            const lockedByThis = seatIds.filter((_, i) => results?.[i][1] === 'OK',);
            if (lockedByThis.length > 0) {
                await this.releaseSeats(showtimeId, lockedByThis, userId);
            }
            throw new BadRequestException('Một hoặc nhiều ghế đang được giữ bởi người khác');
        }
    }

    async releaseSeats(showtimeId: string, seatIds: number[], userId: string) {
        const pipe = this.redisClient.multi();
        for (const seatId of seatIds) {
            const key = this.getSeatHoldKey(showtimeId, seatId);
            (pipe as any).eval(this.SAFE_RELEASE_LUA_SCRIPT, 1, key, userId);
        }
        await pipe.exec();
    }

    async releaseBookingHold(bookingId: string) {
        const hold = await this.getBookingHold(bookingId);
        if (!hold) return;

        await this.releaseSeats(hold.showtimeId, hold.seatIds, hold.userId);
        await this.deleteBookingHold(bookingId);
    }

    async acquirePaymentLock(bookingId: string): Promise<string|null>{
        const key = `payment_create_lock:${bookingId}`;
        const lockValue = randomUUID();
        const result = await (this.redisClient as any).call('SET', key, lockValue, 'NX', 'EX', '15');
        return result === `OK`? lockValue: null;
    }
    
    async releasePaymentLock(bookingId:string, lockValue:string): Promise<void>{
        const key = `payment_create_lock:${bookingId}`;
        await this.redisClient.eval(this.SAFE_RELEASE_LUA_SCRIPT,1,key, lockValue);
    }
}

