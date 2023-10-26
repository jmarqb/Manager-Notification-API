import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { LoggerService } from '../common/logger/logger.service';
import { RedisService } from '../redis/redis.service';
import { GmailService } from '../gmail/gmail.service';
import { MailgunService } from '../mailgun/mailgun.service';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { DeliveryChannel, NotificationType } from './enums/enum.notification';
import { NotFoundException } from '@nestjs/common';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn()
  };

  const mockRedisService = {
    addNotificationToBatch: jest.fn(),
    retrieveBatchNotifications: jest.fn(),
    removeBatchNotifications: jest.fn(),
    getListLength: jest.fn(),
    addHashToList: jest.fn(),
    getAllActiveHashes: jest.fn(),
    removeHashFromList: jest.fn()
  };

  const mockGmailService = { sendEmail: jest.fn() };
  const mockMailgunService = { sendEmail: jest.fn() };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'EMAIL_PROVIDER') {
        return 'gmail';
      }
    })
  };


  const mockNotificationModel =
  {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    countDocuments: jest.fn(),
    findById: jest.fn(),
    findByIdAndUpdate: jest.fn(),
    findByIdAndRemove: jest.fn(),

  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: GmailService, useValue: mockGmailService },
        { provide: MailgunService, useValue: mockMailgunService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: getModelToken(Notification.name), useValue: mockNotificationModel },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });



  describe('create', () => {
    it('should process and save a batch email notification', async () => {
      const dto: CreateNotificationDto = {
        eventEmitted: 'event',
        deliveryChannel: DeliveryChannel.Email,
        notificationType: NotificationType.Batch,
        email: 'test@example.com',
        content: 'Test Content'
      };

      mockRedisService.addNotificationToBatch.mockResolvedValue(1);
      mockRedisService.getAllActiveHashes.mockResolvedValue([])
      mockRedisService.getListLength.mockResolvedValue(1);

      const result = await service.create(dto);

      expect(mockRedisService.addNotificationToBatch).toHaveBeenCalled();
      expect(result.message).toBe('Batch notification processed');
    });

    it('should send an instant email notification', async () => {
      const dto: CreateNotificationDto = {
        eventEmitted: 'event',
        deliveryChannel: DeliveryChannel.Email,
        notificationType: NotificationType.Instant,
        email: 'test@example.com',
        content: 'Test Content'
      };

      mockConfigService.get.mockReturnValueOnce('gmail');

      const result = await service.create(dto);

      expect(mockGmailService.sendEmail).toHaveBeenCalled();
      expect(result.message).toBe('Instant notification processed');
    });

    it('should save a system notification', async () => {
      const dto: CreateNotificationDto = {
        eventEmitted: 'event',
        deliveryChannel: DeliveryChannel.System,
        notificationType: NotificationType.Instant,
        userId: '12345',
        content: 'Test Content'
      };

      const result = await service.create(dto);

      expect(mockNotificationModel.create).toHaveBeenCalled();
      expect(result.message).toBe('System notification processed and saved in the database.');
    });
  });


  describe('findAll', () => {
    const mockPaginationDto = {
      limit: 5,
      offset: 0
    };
    it('should retrieve all notifications', async () => {

      // Mock the data returned by the Model.
      const mocknotifications = [
        {
          "_id": "65344e60c81f09477a7957e4",
          "date": "2023-10-21T22:19:12.479Z",
          "eventEmitted": "Event_nuevo",
          "deliveryChannel": "System",
          "notificationType": "Batch",
          "systemMetadata": {
            "userId": "c573e986-fb91-475c-9043-1b4c05bec643",
            "content": "test_content",
            "_id": "65344e60c81f09477a7957e5"
          },
          "read": false

        },
        {
          "_id": "62355e60c30f09477a7957e4",
          "date": "2023-10-21T22:19:12.479Z",
          "eventEmitted": "Event_test",
          "deliveryChannel": "System",
          "notificationType": "Instant",
          "systemMetadata": {
            "userId": "c573e986-fb91-475c-9043-1b4c05bec643",
            "content": "test_content",
            "_id": "65344e60c81f09477a7957e5"
          },
          "read": true
        },
      ];

      const mockFind = {
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mocknotifications)
      };

      // Verify that the model was called with the correct parameters.
      mockNotificationModel.find.mockReturnValue(mockFind);
      mockNotificationModel.countDocuments.mockResolvedValue(20);

      const result = await service.findAll(mockPaginationDto);

      expect(mockNotificationModel.find).toHaveBeenCalled();
      expect(mockFind.skip).toHaveBeenCalledWith(Number(mockPaginationDto.offset));
      expect(mockFind.limit).toHaveBeenCalledWith(Number(mockPaginationDto.limit));

      // Check the returned result.
      expect(result).toEqual({
        items: mocknotifications,
        total: 20,
        currentPage: 1,
        totalPages: 4
      });

    });

  });



  describe('findNotificationById', () => {
    it('should return a notification by id', async () => {
      const mockNotification = {
        eventEmitted: 'Event1',
        deliveryChannel: DeliveryChannel.System,
        notificationType: NotificationType.Instant,
        content: 'Sample Content'
      };

      mockNotificationModel.findById.mockResolvedValue(mockNotification);

      const result = await service.findNotificationById('12345');
      expect(mockNotificationModel.findById).toHaveBeenCalledWith('12345');
      expect(result).toEqual(mockNotification);
    });

    it('should throw NotFoundException if notification is not found', async () => {
      mockNotificationModel.findById.mockResolvedValue(null);

      await expect(service.findNotificationById('12345')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findNotificationByUserId', () => {
    it('should return notifications by user id', async () => {
      const mockNotifications = [{
        eventEmitted: 'Event1',
        deliveryChannel: DeliveryChannel.System,
        notificationType: NotificationType.Instant,
        content: 'Sample Content'
      }];

      mockNotificationModel.find.mockResolvedValue(mockNotifications);

      const result = await service.findNotificationByUserId('12345');
      expect(mockNotificationModel.find).toHaveBeenCalledWith({ 'systemMetadata.userId': '12345' });
      expect(result).toEqual(mockNotifications);
    });

    it('should throw NotFoundException if no notifications for this userId', async () => {
      mockNotificationModel.find.mockResolvedValue([]);

      await expect(service.findNotificationByUserId('12345')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return a notification', async () => {
      const updateDto = {
        eventEmitted: 'UpdatedEvent'
      };

      const mockUpdatedNotification = {
        _id: '12345',
        eventEmitted: 'UpdatedEvent',
        deliveryChannel: DeliveryChannel.System,
        notificationType: NotificationType.Instant,
        content: 'Sample Content'
      };

      mockNotificationModel.findByIdAndUpdate.mockResolvedValue(mockUpdatedNotification);

      const result = await service.update('12345', updateDto);
      expect(mockNotificationModel.findByIdAndUpdate).toHaveBeenCalledWith('12345', updateDto, { new: true });
      expect(result).toEqual(mockUpdatedNotification);
    });
  });

  describe('remove', () => {
    it('should remove a notification by id', async () => {
      const mockNotification = {
        _id: '12345',
        eventEmitted: 'Event1',
        deliveryChannel: DeliveryChannel.System,
        notificationType: NotificationType.Instant,
        content: 'Sample Content'
      };

      mockNotificationModel.findByIdAndRemove.mockResolvedValue(mockNotification);

      const result = await service.remove('12345');
      expect(mockNotificationModel.findByIdAndRemove).toHaveBeenCalledWith('12345');
      expect(result).toBe('Deleted successfully');
    });
  });

  describe('setReadStatus', () => {
    it('should set read status and return updated notification', async () => {
      const mockNotification = {
        _id: '12345',
        read: false,
        save: jest.fn().mockResolvedValueOnce({ _id: '12345', read: true })
      };

      mockNotificationModel.findById.mockResolvedValue(mockNotification);

      const result = await service.setReadStatus('12345', true);

      expect(mockNotificationModel.findById).toHaveBeenCalledWith('12345');
      expect(result.read).toBe(true);
    });
  });

  describe('sendEmail', () => {
    it('should send email using GmailService', async () => {
      mockConfigService.get.mockReturnValueOnce('gmail');
      await service.sendEmail('test@example.com', 'Subject', 'Text content');

      expect(mockGmailService.sendEmail).toHaveBeenCalled();
      expect(mockMailgunService.sendEmail).not.toHaveBeenCalled();
    });

    it('should send email using MailgunService', async () => {
      mockConfigService.get.mockReturnValueOnce('mailgun');
      await service.sendEmail('test@example.com', 'Subject', 'Text content');

      expect(mockMailgunService.sendEmail).toHaveBeenCalled();
      expect(mockGmailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('saveBatchNotification', () => {
    it('should save the batch notification', async () => {
      const mockNotification = {
        eventEmitted: 'event',
        deliveryChannel: DeliveryChannel.System,
        notificationType: NotificationType.Instant,
        userId: '12345',
        content: 'Test Content'
      };

      await service.saveBatchNotification(mockNotification);

      expect(mockRedisService.addNotificationToBatch).toHaveBeenCalled();
      expect(mockRedisService.addHashToList).toHaveBeenCalled();
    });
  });

  describe('combineNotifications', () => {
    it('should combine multiple notifications', () => {
      const notifications = [

        {
          content: 'Content1', eventEmitted: 'event',
          deliveryChannel: DeliveryChannel.System,
          notificationType: NotificationType.Instant,
          userId: '12345',
        },
        {
          eventEmitted: 'event',
          deliveryChannel: DeliveryChannel.System,
          notificationType: NotificationType.Instant,
          userId: '12345',
          content: 'Content2'
        },
        {
          eventEmitted: 'event',
          deliveryChannel: DeliveryChannel.System,
          notificationType: NotificationType.Instant,
          userId: '12345',
          content: 'Content3'
        }
      ];

      const combined = service.combineNotifications(notifications);

      expect(combined).toBe('Content1\n\nContent2\n\nContent3');
    });
  });

  describe('processBatchNotification', () => {
    it('should process the batch notification', async () => {
      const mockNotifications = [
        { email: 'test@example.com', content: 'Content1' }
      ];

      mockRedisService.retrieveBatchNotifications.mockResolvedValueOnce(mockNotifications);

      await service.processBatchNotification('somehash');

      expect(mockGmailService.sendEmail).toHaveBeenCalled(); 
      expect(mockRedisService.removeBatchNotifications).toHaveBeenCalled();
    });
  });

  describe('handleNotification', () => {
    const notifications = [

      {
        content: 'Content1', eventEmitted: 'event',
        deliveryChannel: DeliveryChannel.System,
        notificationType: NotificationType.Instant,
        userId: '12345',
      },
      {
        eventEmitted: 'event',
        deliveryChannel: DeliveryChannel.System,
        notificationType: NotificationType.Instant,
        userId: '12345',
        content: 'Content2'
      },
      {
        eventEmitted: 'event',
        deliveryChannel: DeliveryChannel.System,
        notificationType: NotificationType.Instant,
        userId: '12345',
        content: 'Content3'
      }
    ];
    it('should handle notifications correctly', async () => {
      const mockHashes = ['hash1', 'hash2'];
      mockRedisService.getAllActiveHashes.mockResolvedValueOnce(mockHashes);
      mockRedisService.getListLength.mockResolvedValueOnce(6); // BATCH_SIZE_LIMIT >=5
      mockRedisService.retrieveBatchNotifications.mockResolvedValueOnce(notifications);
      mockConfigService.get.mockReturnValueOnce('gmail');
      
      
      await service.handleNotification();
      
      await service.sendEmail('test@example.com', 'Subject', 'Text content');
      expect(mockRedisService.getListLength).toHaveBeenCalledTimes(mockHashes.length);
      expect(mockGmailService.sendEmail).toHaveBeenCalled();  
      expect(mockRedisService.removeBatchNotifications).toHaveBeenCalledTimes(mockHashes.length);
    });
  });

afterEach(()=>{
  jest.clearAllMocks();
})
});

