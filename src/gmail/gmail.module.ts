import { Module } from '@nestjs/common';
import { GmailService } from './gmail.service';  
import { GmailController } from './gmail.controller';
import { ConfigModule } from '@nestjs/config';
import { LoggerService } from '../common/logger/logger.service';

@Module({
  imports: [ConfigModule],
  controllers: [GmailController],
  providers: [GmailService,LoggerService],
})
export class GmailModule {}
