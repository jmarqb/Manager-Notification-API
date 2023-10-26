import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { DeliveryChannel, NotificationType } from '../enums/enum.notification';
import { EmailMetadata, SystemMetadata } from './metadata.entity';
import { ApiProperty } from '@nestjs/swagger';

export type NotificationDocument = Notification & Document;

@Schema()
export class Notification {
  
  @ApiProperty({ example: '2023-10-23T10:15:30Z', description: 'Date the notification was created' })
  @Prop({ type: Date })
  date: Date;

  @ApiProperty({ example: 'EVENT_OCURRED', description: 'Name of the event that triggered the notification' })
  @Prop()
  eventEmitted: string;

  @ApiProperty({ 
      example: 'EMAIL', 
      description: 'The method used to deliver the notification, EMAIL or SYSTEM',
      enum: Object.values(DeliveryChannel)
  })
  @Prop()
  deliveryChannel: DeliveryChannel;

  @ApiProperty({ 
      example: 'BATCH', 
      description: 'Type of the notification, BATCH or INSTANT',
      enum: Object.values(NotificationType)
  })
  @Prop()
  notificationType: NotificationType;

  @ApiProperty({ 
      example: { email: 'test@gmail.com', content: 'Test content' }, 
      description: 'Metadata for email-based notifications'
  })
  @Prop({ type: EmailMetadata, required: false })
  emailMetadata?: EmailMetadata;

  @ApiProperty({ 
      example: { userId: 'c589e948-fb91-475c-9043-1b4c05bec680', content: 'Test content' }, 
      description: 'Metadata for system-based notifications'
  })
  @Prop({ type: SystemMetadata, required: false })
  systemMetadata?: SystemMetadata;

  @ApiProperty({ example: false, description: 'Whether the notification has been read or not' })
  @Prop({ default: false })
  read: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.methods.toJSON = function () {
  const { __v, ...data } = this.toObject();
  return data;
};