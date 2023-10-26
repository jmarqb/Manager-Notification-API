import { Test, TestingModule } from '@nestjs/testing';
import { MailgunService } from './mailgun.service';
import { ConfigService } from '@nestjs/config';

// Mock de la librería Mailgun
jest.mock('mailgun.js', () => {
  return {
    default: jest.fn().mockImplementation(() => {
      return {
        client: jest.fn().mockReturnValue({
          messages: {
            create: jest.fn(),
          },
        }),
      };
    }),
  };
});

describe('MailgunService', () => {
  let service: MailgunService;
  const mockConfigService = {
    get: jest.fn(),
  };
  let mockMailgunCreate;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailgunService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MailgunService>(MailgunService);
    mockMailgunCreate = service['mg'].messages.create;
  });

  describe('sendEmail', () => {
    it('should send an email', async () => {
      mockConfigService.get.mockReturnValue('mailgun@sandbox-123.mailgun.org');
      mockMailgunCreate.mockResolvedValue({ 
        id: 'testMessageId', 
        message: 'Hello!' 
      });

      const result = await service.sendEmail(
        'test@example.com',
        'Test Subject',
        'Test Text',
        '<p>Test HTML</p>'
      );

      expect(result).toEqual({
        id: 'testMessageId',
        message: 'Hello!',
      });
      expect(mockMailgunCreate).toHaveBeenCalled();
    });

    it('should throw an error if sending email fails', async () => {
      mockConfigService.get.mockReturnValue('mailgun@sandbox-123.mailgun.org');
      mockMailgunCreate.mockRejectedValue(new Error('Failed to send email.'));

      await expect(
        service.sendEmail('test@example.com', 'Test Subject', 'Test Text', '<p>Test HTML</p>')
      ).rejects.toThrow('Failed to send email.');
    });
  });
});
