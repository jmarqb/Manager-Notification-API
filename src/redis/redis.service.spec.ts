import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from './redis.service';
import { LoggerService } from '../common/logger/logger.service';
import { DeliveryChannel, NotificationType } from '../notification/enums/enum.notification';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';

describe('RedisService', () => {
  let service: RedisService;

  const mockLoggerService = {
    log: jest.fn(),
    error:jest.fn()
  };

  const mockRedisClient = {
    rpush: jest.fn(),
    lrange: jest.fn(),
    del: jest.fn(),
    llen: jest.fn(),
    sadd: jest.fn(),
    smembers: jest.fn(),
    srem: jest.fn(),
    on: jest.fn(),
    disconnect: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: LoggerService, useValue: mockLoggerService },
        { provide: 'REDIS_CLIENT', useValue: mockRedisClient },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });


  it('should add notification batch succesfully', async () => {
    const key = 'testKey';
    const value = {
      eventEmitted: 'event_test',
      deliveryChannel: DeliveryChannel.Email,
      email: 'test@gmail.com',
      notificationType: NotificationType.Batch,
      content: 'content'
    };
    mockRedisClient.rpush.mockResolvedValueOnce(1);

    const result = await service.addNotificationToBatch(key, value);

    expect(result).toBe(1);
    expect(mockLoggerService.log).toHaveBeenCalled();
  });

  it('should retrieve notifications from a batch successfully', async () => {
    const key = 'testKey';
    const mockNotifications = [
      JSON.stringify({ content: 'content1' }),
      JSON.stringify({ content: 'content2' })
    ];
  
    mockRedisClient.lrange.mockResolvedValueOnce(mockNotifications);
    const result = await service.retrieveBatchNotifications(key);
  
    expect(result.length).toBe(2);
    expect(mockLoggerService.log).toHaveBeenCalled();
  });
  
  it('should remove notifications from a batch successfully', async () => {
    const key = 'testKey';
    
    await service.removeBatchNotifications(key);
  
    expect(mockRedisClient.del).toHaveBeenCalledWith(`notification:${key}`);
    expect(mockLoggerService.log).toHaveBeenCalled();
  });
  
  it('should get the list length successfully', async () => {
    const key = 'testKey';
    mockRedisClient.llen.mockResolvedValueOnce(5);
  
    const result = await service.getListLength(key);
  
    expect(result).toBe(5);
    expect(mockLoggerService.log).toHaveBeenCalled();
  });

  it('should add a hash to the list successfully', async () => {
    const hash = 'testHash';
  
    await service.addHashToList(hash);
  
    expect(mockRedisClient.sadd).toHaveBeenCalledWith('active_hashes', hash);
    expect(mockLoggerService.log).toHaveBeenCalled();
  });

  it('should retrieve all active hashes successfully', async () => {
    const mockHashes = ['hash1', 'hash2'];
    mockRedisClient.smembers.mockResolvedValueOnce(mockHashes);
  
    const result = await service.getAllActiveHashes();
  
    expect(result.length).toBe(2);
    expect(mockLoggerService.log).toHaveBeenCalled();
  });

  it('should remove a hash from the list successfully', async () => {
    const hash = 'testHash';
  
    await service.removeHashFromList(hash);
  
    expect(mockRedisClient.srem).toHaveBeenCalledWith('active_hashes', hash);
    expect(mockLoggerService.log).toHaveBeenCalled();
  });

  it('should log and throw an error for ETIMEDOUT', async () => {
    const key = 'testKey';
    const value = {
      eventEmitted: 'event_test',
      deliveryChannel: DeliveryChannel.Email,
      email: 'test@gmail.com',
      notificationType: NotificationType.Batch,
      content: 'content'
    };
  
    mockRedisClient.rpush.mockRejectedValueOnce({ code: 'ETIMEDOUT' });
  
    await expect(service.addNotificationToBatch(key, value)).rejects.toThrow(InternalServerErrorException);
    expect(mockLoggerService.error).toHaveBeenCalledWith('Error in Redis:', { code: 'ETIMEDOUT' });
  });
  
  it('should log and throw an error for WRONGTYPE in message', async () => {
    const key = 'testKey';
  
    mockRedisClient.lrange.mockRejectedValueOnce({ message: 'WRONGTYPE Operation not allowed' });
  
    await expect(service.retrieveBatchNotifications(key)).rejects.toThrow(BadRequestException);
    expect(mockLoggerService.error).toHaveBeenCalledWith('Error in Redis:', { message: 'WRONGTYPE Operation not allowed' });
  });
  
  it('should log and throw an error for ECONNREFUSED', async () => {
    const key = 'testKey';
    
    mockRedisClient.lrange.mockRejectedValueOnce({ code: 'ECONNREFUSED' });
  
    await expect(service.retrieveBatchNotifications(key)).rejects.toThrow(InternalServerErrorException);
    expect(mockLoggerService.error).toHaveBeenCalledWith('Error in Redis:', { code: 'ECONNREFUSED' });
  });

  it('should log and throw an error for ECONNRESET', async () => {
    const key = 'testKey';
    
    mockRedisClient.lrange.mockRejectedValueOnce({ code: 'ECONNRESET' });
  
    await expect(service.retrieveBatchNotifications(key)).rejects.toThrow(InternalServerErrorException);
    expect(mockLoggerService.error).toHaveBeenCalledWith('Error in Redis:', { code: 'ECONNRESET' });
  });

  it('should log and throw an error for NOAUTH in message', async () => {
    const key = 'testKey';
  
    mockRedisClient.lrange.mockRejectedValueOnce({ message: 'NOAUTH Authentication required' });
  
    await expect(service.retrieveBatchNotifications(key)).rejects.toThrow(InternalServerErrorException);
    expect(mockLoggerService.error).toHaveBeenCalledWith('Error in Redis:', { message: 'NOAUTH Authentication required' });
  });

  it('should log and throw a specific Redis error for ERR in message', async () => {
    const key = 'testKey';
    
    mockRedisClient.lrange.mockRejectedValueOnce({ message: 'ERR some specific redis error' });
  
    await expect(service.retrieveBatchNotifications(key)).rejects.toThrow(BadRequestException);
    expect(mockLoggerService.error).toHaveBeenCalledWith('Error in Redis:', { message: 'ERR some specific redis error' });
  });

  it('should log and throw an unknown error', async () => {
    const key = 'testKey';
    
    mockRedisClient.lrange.mockRejectedValueOnce({});
  
    await expect(service.retrieveBatchNotifications(key)).rejects.toThrow(InternalServerErrorException);
    expect(mockLoggerService.error).toHaveBeenCalledWith('Error in Redis:', {});
  });
  
 
});
