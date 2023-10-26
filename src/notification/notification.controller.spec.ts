import { Test, TestingModule } from '@nestjs/testing';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';
import { GmailService } from '../gmail/gmail.service';
import { RedisService } from '../redis/redis.service';
import { MailgunService } from '../mailgun/mailgun.service';
import { DeliveryChannel, NotificationType } from './enums/enum.notification';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('NotificationController', () => {
  let controller: NotificationController;

  const mockNotificationService = {
    create:jest.fn(),
    findAll:jest.fn(),
    findNotificationById:jest.fn(),
    findNotificationByUserId:jest.fn(),
    update:jest.fn(),
    setReadStatus:jest.fn(),
    remove:jest.fn(),
  }

  const createNotificationDto = {
    eventEmitted: 'event_test',
    deliveryChannel: DeliveryChannel.Email,
    email: 'test@gmail.com',
    notificationType: NotificationType.Batch,
    content: 'content',
  };

  const mockGmailService = {}

  const mockRedisService = {}

  const mockMailgunService = {}

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationController],
      providers: [
      {provide: NotificationService, useValue:mockNotificationService},
      {provide: GmailService, useValue:mockGmailService},
      {provide: RedisService, useValue:mockRedisService},
      {provide: MailgunService, useValue:mockMailgunService},
      ],
    }).compile();

    controller = module.get<NotificationController>(NotificationController);
  });


  describe('NotificationController - create method',()=>{
    it('should process a batch email notification', async () => {
      mockNotificationService.create.mockResolvedValue({ message: "Batch notification processed" });
      
      const result = await controller.create(createNotificationDto);
      
      expect(result).toEqual({ message: "Batch notification processed" });
      expect(mockNotificationService.create).toHaveBeenCalledWith(createNotificationDto);
    });
    
    it('should process an instant email notification', async () => {
      const instantDto = { ...createNotificationDto, notificationType: NotificationType.Instant };
      mockNotificationService.create.mockResolvedValue({ message: "Instant notification processed" });
      
      const result = await controller.create(instantDto);
      
      expect(result).toEqual({ message: "Instant notification processed" });
      expect(mockNotificationService.create).toHaveBeenCalledWith(instantDto);
    });
    
    it('should process and save a system notification', async () => {
      const systemDto = { ...createNotificationDto, deliveryChannel: DeliveryChannel.System };
      mockNotificationService.create.mockResolvedValue({ message: "System notification processed and saved in the database." });
      
      const result = await controller.create(systemDto);
      
      expect(result).toEqual({ message: "System notification processed and saved in the database." });
      expect(mockNotificationService.create).toHaveBeenCalledWith(systemDto);
    });
    
    it('should throw an error when email sending fails', async () => {
      mockNotificationService.create.mockRejectedValue(new BadRequestException('Error sending email'));
      
      await expect(controller.create(createNotificationDto)).rejects.toThrow(BadRequestException);
      expect(mockNotificationService.create).toHaveBeenCalledWith(createNotificationDto);
    });
  });

  describe('NotificationController - findAll method', () => {
    it('should return a paginated result', async () => {
      const paginationDto = { limit: 10, offset: 0 };
      const paginatedResult = {
        items: [createNotificationDto],
        total: 1,
        currentPage: 1,
        totalPages: 1
      };
  
      mockNotificationService.findAll.mockResolvedValue(paginatedResult);
  
      const result = await controller.findAll(paginationDto);
  
      expect(result).toEqual(paginatedResult);
      expect(mockNotificationService.findAll).toHaveBeenCalledWith(paginationDto);
    });
  });

  describe('NotificationController - findNotificationById method', () => {
    it('should return a notification by id', async () => {
      const id = 'testId123';
  
      mockNotificationService.findNotificationById.mockResolvedValue(createNotificationDto);
  
      const result = await controller.findNotificationById(id);
  
      expect(result).toEqual(createNotificationDto);
      expect(mockNotificationService.findNotificationById).toHaveBeenCalledWith(id);
    });
  
    it('should throw an error when no notification is found by id', async () => {
      const id = 'wrongId123';
      
      mockNotificationService.findNotificationById.mockRejectedValue(new NotFoundException());
  
      await expect(controller.findNotificationById(id)).rejects.toThrow(NotFoundException);
    });
  });

  describe('NotificationController - findNotificationByUserId method', () => {
    it('should return notifications by user id', async () => {
      const userId = 'userId123';
  
      mockNotificationService.findNotificationByUserId.mockResolvedValue([createNotificationDto]);
  
      const result = await controller.findNotificationByUserId(userId);
  
      expect(result).toEqual([createNotificationDto]);
      expect(mockNotificationService.findNotificationByUserId).toHaveBeenCalledWith(userId);
    });
  });

  describe('NotificationController - update method', () => {
    it('should update a notification by id', async () => {
      const id = 'testId123';
      const updateNotificationDto = { ...createNotificationDto, content: 'updated content' };
  
      mockNotificationService.update.mockResolvedValue(updateNotificationDto);
  
      const result = await controller.update(id, updateNotificationDto);
  
      expect(result).toEqual(updateNotificationDto);
      expect(mockNotificationService.update).toHaveBeenCalledWith(id, updateNotificationDto);
    });
  });
  
  describe('NotificationController - setReadStatus method', () => {
    it('should mark a notification as read', async () => {
      const id = 'testId123';
      const updatedNotification = { ...createNotificationDto, read: true };
  
      mockNotificationService.setReadStatus.mockResolvedValue(updatedNotification);
  
      const result = await controller.markAsRead(id);
  
      expect(result).toEqual(updatedNotification);
      expect(mockNotificationService.setReadStatus).toHaveBeenCalledWith(id, true);
    });
  
    it('should mark a notification as unread', async () => {
      const id = 'testId123';
      const updatedNotification = { ...createNotificationDto, read: false };
  
      mockNotificationService.setReadStatus.mockResolvedValue(updatedNotification);
  
      const result = await controller.markAsUnread(id);
  
      expect(result).toEqual(updatedNotification);
      expect(mockNotificationService.setReadStatus).toHaveBeenCalledWith(id, false);
    });
  });
  
  describe('NotificationController - remove method', () => {
    it('should remove a notification by id', async () => {
      const id = 'testId123';
  
      mockNotificationService.remove.mockResolvedValue('Deleted successfully');
  
      const result = await controller.remove(id);
  
      expect(result).toEqual('Deleted successfully');
      expect(mockNotificationService.remove).toHaveBeenCalledWith(id);
    });
  });

});
