import { IsNotEmpty, IsString } from "class-validator";

export class CreateScreenTypeDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    description: string;

}
