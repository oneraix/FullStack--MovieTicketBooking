import { IsArray, IsNotEmpty, IsUUID } from "class-validator";

export class CreatePaymentDto {
    @IsUUID()
    @IsNotEmpty()
    booking_id:string;

}
