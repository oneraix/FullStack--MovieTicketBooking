import { Provider } from "@nestjs/common";
import Redis from "ioredis";

export const IOREDIS_CLIENT = 'IOREDIS_CLIENT';//injection token


export const redisProvider: Provider ={
    provide: IOREDIS_CLIENT,
    useFactory:() =>{
        return new Redis({
            host:'localhost',
            port: 6379,
        });
    }
}