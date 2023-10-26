import { ApiProperty } from '@nestjs/swagger';

export class SendEmailRequestDto {
  @ApiProperty()
  to: string;

  @ApiProperty()
  subject: string;

  @ApiProperty()
  message: string;
}
