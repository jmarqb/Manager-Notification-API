import { 
    IsDate, IsDefined, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateIf 
} from "class-validator";
import { DeliveryChannel, NotificationType } from "../enums/enum.notification";
import { ApiProperty } from "@nestjs/swagger";

export class CreateNotificationDto {

    
    @ApiProperty({ 
        type: Date,
        example: '2023-10-23T10:15:30Z',
        description: 'Date the notification was emitted. If not provided, the current date will be used.'
    })
    @IsOptional()
    @IsDate()
    dateEmitted?: Date;

    @ApiProperty({ 
        example: 'EVENT_OCURRED', 
        description: 'Name of the event that triggered the notification'
    })
    @IsString()
    @IsNotEmpty()
    eventEmitted: string;

    @ApiProperty({ 
        enum: ['Email', 'System'],
        example: 'Email',
        description: 'The method chosen to deliver the notification'
    })
    @IsEnum(DeliveryChannel)
    deliveryChannel: DeliveryChannel;

    @ApiProperty({ 
        enum: ['Instant', 'Batch'],
        example: 'Instant',
        description: 'Type of the notification. Instant for immediate notifications, Batch for grouped ones.'
    })
    @IsEnum(NotificationType)
    notificationType: NotificationType;

    @ApiProperty({ 
        example: 'test@gmail.com',
        description: 'Recipient email address. Required when deliveryChannel is "Email".'
    })
    @ValidateIf(o => o.deliveryChannel === DeliveryChannel.Email)
    @IsDefined()
    @IsString()
    @IsEmail()
    email?: string;

    @ApiProperty({ 
        example: 'c589e948-fb91-475c-9043-1b4c05bec680',
        description: 'User ID to which the system notification is directed. Required when deliveryChannel is "System".'
    })
    @ValidateIf(o => o.deliveryChannel === DeliveryChannel.System)
    @IsDefined()
    @IsString()
    @IsUUID()
    userId?: string;

    @ApiProperty({ 
        example: 'Test content',
        description: 'Content of the notification'
    })
    @IsDefined()
    @IsString()
    @IsNotEmpty()
    content: string;

    // Ensure the `email` field is not present when `deliveryChannel` is 'system'
    @ValidateIf(o => o.deliveryChannel === DeliveryChannel.System && o.email)
    @IsNotEmpty({ message: 'The "email" field should not be present when the deliveryChannel is "system".' })
    emailNotAllowedWhenSystem?: string;

    // Ensure the `userId` field is not present when `deliveryChannel` is 'email'
    @ValidateIf(o => o.deliveryChannel === DeliveryChannel.Email && o.userId)
    @IsNotEmpty({ message: 'The "userId" field should not be present when the deliveryChannel is "email".' })
    userIdNotAllowedWhenEmail?: string;

}
