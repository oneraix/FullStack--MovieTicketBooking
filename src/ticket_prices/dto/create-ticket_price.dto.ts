import { IsInt, Min, Max, IsString, Matches, IsNumber, IsPositive } from 'class-validator';

export class CreateTicketPriceDto {
  @IsInt()
  @Min(0)   // 0 = Chủ nhật
  @Max(6)   // 6 = Thứ 7
  day_of_week: number;

  @IsString()
  @Matches(/^\d{2}:\d{2}:\d{2}$/, { message: 'time_start phải có định dạng HH:MM:SS' })//vì time trong db dùng @db.Time(6) nên phải truyền Date object vì Client truyền date dạng string
  time_start: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}:\d{2}$/, { message: 'time_end phải có định dạng HH:MM:SS' })
  time_end: string;

  @IsNumber()
  @IsPositive()
  base_price: number;
}
