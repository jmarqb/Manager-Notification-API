import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { MongooseModule } from '@nestjs/mongoose';
import {
  Notification,
  NotificationSchema,
} from './entities/notification.entity';
import { CommonModule } from '../common/common.module';
import { GmailService } from '../gmail/gmail.service';
import { ConfigModule } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { MailgunService } from '../mailgun/mailgun.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
    CommonModule,
    ConfigModule,
  ],
  controllers: [NotificationController],
  providers: [NotificationService, GmailService, RedisService, MailgunService],
})
export class NotificationModule {}
