import { IsNotEmpty, IsString, MaxLength } from "class-validator";


export class CreateCinemaDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(500)
    location: string;
}
