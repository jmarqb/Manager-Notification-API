import { Prop, Schema } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

@Schema()
export class EmailMetadata {
  
  @ApiProperty({ example: 'test@gmail.com', description: 'Recipient email address' })
  @Prop()
  email: string;

  @ApiProperty({ example: 'Test content', description: 'Content of the notification' })
  @Prop()
  content: string;
}

@Schema()
export class SystemMetadata {
  
  @ApiProperty({ example: 'c589e948-fb91-475c-9043-1b4c05bec680', description: 'ID of the user to notify' })
  @Prop()
  userId: string;

  @ApiProperty({ example: 'Test content', description: 'Content of the notification' })
  @Prop()
  content: string;
}
