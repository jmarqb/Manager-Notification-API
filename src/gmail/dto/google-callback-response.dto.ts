import { ApiProperty } from '@nestjs/swagger';

export class GoogleCallbackResponseDto {
  @ApiProperty()
  access_token: string;

  @ApiProperty()
  refresh_token: string;

  @ApiProperty()
  token_type: string;

  @ApiProperty()
  expiry_date: number;
}
