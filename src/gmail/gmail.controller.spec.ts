import { Test, TestingModule } from '@nestjs/testing';
import { GmailController } from './gmail.controller';
import { GmailService } from './gmail.service';
import { LoggerService } from '../common/logger/logger.service';

describe('GmailController', () => {
  let controller: GmailController;
  let gmailService: jest.Mocked<GmailService>;

  const mockLoggerService = {
    error: jest.fn(),
  }

  afterEach(() => {
    jest.clearAllMocks();
  });

  beforeEach(async () => {
    const mockGmailService = {
      sendEmail: jest.fn(),
      getAuthUrl: jest.fn(),
      getTokensFromCode: jest.fn(),
      
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GmailController],
      providers:[
        { provide: GmailService, useValue: mockGmailService },
        { provide: LoggerService, useValue: mockLoggerService }
        
      ]
    }).compile();

    controller = module.get<GmailController>(GmailController);
    gmailService = module.get<GmailService>(GmailService) as jest.Mocked<GmailService>; 
  });

  describe('sendEmail', () => {
    it('should send an email and return a success status', async () => {
      gmailService.sendEmail.mockResolvedValue(undefined);

      const result = await controller.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        message: 'Test Message',
      });

      expect(result).toEqual({ status: 'Email sent successfully!' });
      expect(gmailService.sendEmail).toHaveBeenCalledWith('test@example.com', 'Test', 'Test Message');
    });

    it('should throw an error if sendEmail fails', async () => {
      gmailService.sendEmail.mockRejectedValue(new Error('Email error')); 
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

  describe('redirectToGoogleAuth', () => {
    it('should redirect to google auth', () => {
      const mockUrl = 'http://mocked.google.auth.url';
      gmailService.getAuthUrl.mockReturnValue(mockUrl);
  
      const result = controller.redirectToGoogleAuth();
  
      expect(result).toBe(mockUrl);
      expect(gmailService.getAuthUrl).toHaveBeenCalled();
    });
  });
  
  describe('handleGoogleCallback', () => {
    const mockTokenResponse = {
      access_token: 'mockedAccessToken',
      refresh_token: 'mockedRefreshToken',
      token_type: 'Bearer',
      expiry_date: new Date().getTime() + 3600 * 1000,
    };
    it('should handle google callback and return success message', async () => {
      const mockCode = 'mockedAuthCode';
      const expectedResponse = {
        status: 'success',
        message: 'Autentication successfully and tokens saving.',
      };
      gmailService.getTokensFromCode.mockResolvedValue(mockTokenResponse);
  
      const result = await controller.handleGoogleCallback(mockCode);
  
      expect(result).toEqual(expectedResponse);
      expect(gmailService.getTokensFromCode).toHaveBeenCalledWith(mockCode);
    });
  });
  
});
