import { Module } from '@nestjs/common';
import { MailgunService } from './mailgun.service';
import { ConfigModule } from '@nestjs/config';
import { MailgunController } from './mailgun.controller';
import { LoggerService } from '../common/logger/logger.service';

@Module({
    imports:[
        ConfigModule
    ],
    providers:[MailgunService,LoggerService],
    controllers: [MailgunController]
})
export class MailgunModule {}
