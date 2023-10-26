import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification } from './entities/notification.entity';
import { LoggerService } from '../common/logger/logger.service';
import { computeNotificationHash } from '../common/utils/hash.utils';
import { RedisService } from '../redis/redis.service';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { PaginationDto } from '../common/dto/pagination.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GmailService } from '../gmail/gmail.service';
import { MailgunService } from '../mailgun/mailgun.service';
import { ConfigService } from '@nestjs/config';

const BATCH_SIZE_LIMIT = 5;

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly gmailService: GmailService,
    private mailgunService: MailgunService,
  ) {}

  // Scheduled to check and process batch notifications every 30 minutes
  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleTimeoutNotifications() {
    try {
      this.logger.log('Checking pending notifications...');

      //Get all the hashes (keys) of the notifications stored in Redis.
      const allHashes = await this.redisService.getAllActiveHashes();
      this.logger.log(
        `Retrieved ${allHashes.length} hashes of the notification stored.`,
      );

      for (const hash of allHashes) {
        //For each hash, check if the notification has exceeded the batch size.
        const listLength = await this.redisService.getListLength(
          `notification:${hash}`,
        );
        this.logger.log(`Hash ${hash} has ${listLength} notifications.`);

        //Process the notification after time has ended
        await this.processBatchNotification(hash);
        this.logger.log(
          `Notification with hash ${hash} processed successfully.`,
        );

        //Delete the processed notification from Redis.
        await this.removeProcessedBatch(hash);
        this.logger.log(`Notification with hash ${hash} removed from store.`);

        //Remove the hash from the list of active hashes.
        await this.redisService.removeHashFromList(hash);
        this.logger.log(`Hash ${hash} removed from the list of active hashes.`);
      }
    } catch (error) {
      this.logger.error(`Error processing notifications: ${error.details}`);
      console.log('error:', error);
    }
  }

  //Send email accord to provider
  async sendEmail(
    to: string,
    subject: string,
    text: string,
    html?: string,
  ): Promise<void> {
    const provider = this.configService.get<string>('EMAIL_PROVIDER');

    if (provider === 'gmail') {
      return this.gmailService.sendEmail(to, subject, text);
    } else if (provider === 'mailgun') {
      return this.mailgunService.sendEmail(to, subject, text, html);
    } else {
      throw new Error('Email provider not supported');
    }
  }

  // Creates a new notification, and depending on the delivery channel establish the way to process them.
  async create(createNotificationDto: CreateNotificationDto) {
    createNotificationDto.dateEmitted = new Date();
    createNotificationDto.eventEmitted =
      createNotificationDto.eventEmitted.charAt(0).toUpperCase() +
      createNotificationDto.eventEmitted.slice(1);
    this.logger.log(
      `New notification with delivery channel: ${createNotificationDto.deliveryChannel} and Type: ${createNotificationDto.notificationType}`,
    );

    if (
      createNotificationDto.deliveryChannel === 'Email' &&
      createNotificationDto.notificationType === 'Batch'
    ) {
      // Process the notification batch
      await this.saveBatchNotification(createNotificationDto);
      await this.handleNotification();
      return { message: 'Batch notification processed' };
    }

    if (
      createNotificationDto.deliveryChannel === 'Email' &&
      createNotificationDto.notificationType === 'Instant'
    ) {
      try {
        await this.sendEmail(
          `${createNotificationDto.email}`,
          'Nest service test',
          `${createNotificationDto.content}`,
        );
        this.logger.log('Email sent successfully.');
        return { message: 'Instant notification processed' };
      } catch (error) {
        this.logger.error(`Error sending email: ${error}`);
        throw new BadRequestException(`Error sending email: ${error}`);
      }
    } else if (createNotificationDto.deliveryChannel === 'System') {
      //Store the notification in the database
      try {
        await this.notificationModel.create({
          date: new Date(),
          eventEmitted: createNotificationDto.eventEmitted,
          deliveryChannel: createNotificationDto.deliveryChannel,
          notificationType: createNotificationDto.notificationType,
          systemMetadata: {
            userId: createNotificationDto.userId,
            content: createNotificationDto.content,
          },
        });
        this.logger.log(
          'System notification processed and saved in the database.',
        );
        return {
          message: 'System notification processed and saved in the database.',
        };
      } catch (error) {
        this.handlerDbErrors(error);
      }
    }
  }

  // Notification Process
  async handleNotification() {
    //Get all the hashes (keys) of the notifications stored in Redis.
    const allHashes = await this.redisService.getAllActiveHashes();
    this.logger.log(
      `Retrieved ${allHashes.length} hashes of the notification stored.`,
    );

    for (const hash of allHashes) {
      //For each hash, check if the notification has exceeded the batch size.
      const listLength = await this.redisService.getListLength(
        `notification:${hash}`,
      );
      this.logger.log(`Hash ${hash} has ${listLength} notifications.`);

      if (listLength >= BATCH_SIZE_LIMIT) {
        //Process the notification after time has ended
        await this.processBatchNotification(hash);
        this.logger.log(
          `Notification with hash ${hash} processed successfully.`,
        );

        //Delete the processed notification from Redis.
        await this.removeProcessedBatch(hash);
        this.logger.log(`Notification with hash ${hash} removed from store.`);

        //Remove the hash from the list of active hashes.
        await this.redisService.removeHashFromList(hash);
        this.logger.log(`Hash ${hash} removed from the list of active hashes.`);
      }
    }
  }

  // Stores a notification in a batch in Redis and adds the hash to the list of active hashes
  async saveBatchNotification(notification: CreateNotificationDto) {
    const hash = computeNotificationHash(
      notification.eventEmitted,
      notification.deliveryChannel,
      notification.email || notification.userId,
    );
    this.logger.log(
      `Storing notification with hash: ${hash}. Detail: ${JSON.stringify(
        notification.eventEmitted,
      )}`,
    );
    await this.redisService.addNotificationToBatch(hash, notification);
    await this.redisService.addHashToList(hash);
  }

  // Combines batch notifications in a single message
  combineNotifications(notifications: CreateNotificationDto[]): string {
    return notifications.map((notif) => notif.content).join('\n\n');
  }

  // Deletes processed notifications from a batch in Redis
  async removeProcessedBatch(hash: string) {
    await this.redisService.removeBatchNotifications(hash);
  }

  // Processes batch notifications, combines them, and sends them based on the delivery channel
  async processBatchNotification(hash: string) {
    const notifications =
      await this.redisService.retrieveBatchNotifications(hash);
    const combinedMessage = this.combineNotifications(notifications);
    const recipientEmail = notifications[0]?.email;

    this.logger.log(`Processing notifications with hash ${hash}.`);
    if (notifications[0] && notifications[0].email) {
      try {
        await this.sendEmail(
          recipientEmail,
          'Nest service test',
          combinedMessage,
        );
        this.logger.log('Email sent successfully.');
      } catch (error) {
        this.logger.error(`Error sending email: ${error}`);
        throw new BadRequestException(`Error sending email: ${error}`);
      }
    }
    // Delete the processed notifications from Redis
    await this.removeProcessedBatch(hash);
  }

  // Retrieves all paginated notifications from Database
  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Notification>> {
    const { limit = 10, offset = 0 } = paginationDto;

    const notifications = await this.notificationModel
      .find()
      .skip(Number(offset))
      .limit(Number(limit))
      .exec();

    const total: number = await this.notificationModel.countDocuments();
    const totalPages: number = Math.ceil(total / limit);

    return {
      items: notifications,
      total: total,
      currentPage: offset / limit + 1,
      totalPages: totalPages,
    };
  }

  // Searches and returns a specific notification by Id
  async findNotificationById(id: string): Promise<Notification> {
    try {
      const notification = await this.notificationModel.findById(id);

      if (!notification) {
        throw new NotFoundException(
          `Notification with ID ${id} not found in the database`,
        );
      }
      return notification;
    } catch (error) {
      this.handlerDbErrors(error);
    }
  }

  //Searches and returns notifications by user Id
  async findNotificationByUserId(id: string) {
    try {
      const notifications = await this.notificationModel.find({
        'systemMetadata.userId': id,
      });

      if (notifications.length === 0) {
        this.logger.error(
          'User not found or no notifications for this userId.',
        );
        throw new NotFoundException(
          'User not found or no notifications for this userId.',
        );
      }
      return notifications;
    } catch (error) {
      this.handlerDbErrors(error);
    }
  }

  // Updates a specific notification by Id
  async update(id: string, updateNotificationDto: UpdateNotificationDto) {
    if (updateNotificationDto.eventEmitted) {
      updateNotificationDto.eventEmitted =
        updateNotificationDto.eventEmitted.charAt(0).toUpperCase() +
        updateNotificationDto.eventEmitted.slice(1);
    }
    try {
      const updatedNotification =
        await this.notificationModel.findByIdAndUpdate(
          id,
          updateNotificationDto,
          { new: true },
        );
      if (!updatedNotification) {
        throw new NotFoundException(
          `Notification with ID ${id} not found in the database`,
        );
      }

      return updatedNotification;
    } catch (error) {
      this.handlerDbErrors(error);
    }
  }

  //function to handler read and unread notification status
  async setReadStatus(id: string, status: boolean): Promise<Notification> {
    try {
      const notification = await this.notificationModel.findById(id);
      if (!notification) {
        throw new NotFoundException(`Notification with ID ${id} not found`);
      }
      notification.read = status;
      return notification.save();
    } catch (error) {
      this.handlerDbErrors(error);
    }
  }

  // Delete a specific notification by Id
  async remove(id: string) {
    try {
      const notification = await this.notificationModel.findByIdAndRemove(id);

      if (!notification) {
        throw new NotFoundException(
          `Notification with ID ${id} not found in the database`,
        );
      }
      return 'Deleted successfully';
    } catch (error) {
      this.handlerDbErrors(error);
    }
  }

  // Handles errors
  private handlerDbErrors(error: any) {
    if (error.status === 404) {
      this.logger.error('Not Found.', error.detail);
      throw new NotFoundException('Element not found in the database.');
    }
    if (error.status === 400) {
      this.logger.error('Bad Request.', error.detail);
      throw new BadRequestException(error.detail);
    }

    if (error.name === 'ValidationError') {
      this.logger.error('Validation error.', error.message);
      throw new BadRequestException('Invalid input data.');
    }

    this.logger.error('Unknown error in the database.', error);
    throw new InternalServerErrorException('Please check server logs.');
  }
}
