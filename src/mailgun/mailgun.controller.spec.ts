import { Test, TestingModule } from '@nestjs/testing';
import { MailgunController } from './mailgun.controller';
import { MailgunService } from './mailgun.service';
import { LoggerService } from '../common/logger/logger.service';

describe('MailgunController', () => {
  let controller: MailgunController;
  let mailgunService: jest.Mocked<MailgunService>;

  const mockLoggerService = {
    error: jest.fn(),
  }

  beforeEach(async () => {
    const mockMailgunService = {
      sendEmail: jest.fn(),
    };



    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailgunController],
      providers:[
        { provide: MailgunService, useValue: mockMailgunService },
        { provide: LoggerService, useValue: mockLoggerService }
      ]

    }).compile();

    controller = module.get<MailgunController>(MailgunController);
    mailgunService = module.get<MailgunService>(MailgunService) as jest.Mocked<MailgunService>; 

  });

  describe('sendEmail', () => {
    it('should send an email and return a success status', async () => {
      mailgunService.sendEmail.mockResolvedValue(undefined);

      const result = await controller.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        message: 'Test Message',
      });

      expect(result).toEqual({ status: 'Email sent successfully!' });
      expect(mailgunService.sendEmail).toHaveBeenCalledWith('test@example.com', 'Test', 'Test Message');
    });

    it('should throw an error if sendEmail fails', async () => {
      mailgunService.sendEmail.mockRejectedValue(new Error('Email error')); 
      let error;
    
      try {
        await controller.sendEmail({
          to: 'test@example.com',
          subject: 'Test',
          message: 'Test Message',
        });
      } catch (e) {
        error = e;
      }
      expect(mockLoggerService.error.mock.calls[0][0].message).toBe('Email error');

      expect(error.response.error).toBe('There was an error processing the request.');
    });
    
  });
});
