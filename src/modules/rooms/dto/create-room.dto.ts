import { IsInt, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateRoomDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsInt()
    cinema_id: number;

    @IsInt()
    @IsOptional()
    screen_type_id?: number;

    @IsInt()
    @IsOptional()
    capacity?: number;
}
