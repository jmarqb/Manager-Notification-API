import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { GmailService } from './gmail/gmail.service';
import { GmailModule } from './gmail/gmail.module';
import { RedisModule } from './redis/redis.module';
import { ScheduleModule } from '@nestjs/schedule';
import { MailgunService } from './mailgun/mailgun.service';
import { MailgunModule } from './mailgun/mailgun.module';

@Module({
  imports: [
    NotificationModule,

    ConfigModule.forRoot(),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get('MONGODB_CNN'),
        autoCreate: true,
      }),
      inject: [ConfigService],
    }),
    ScheduleModule.forRoot(),

    RedisModule.register(),

    AuthModule,

    GmailModule,

    MailgunModule,
  ],
  providers: [GmailService, MailgunService],
})
export class AppModule {}
