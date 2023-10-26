import { Test, TestingModule } from '@nestjs/testing';
import { GmailService } from './gmail.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as fs from 'fs';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
  promises: {
    writeFile: jest.fn()
  }
}));

jest.mock('axios'); 

const mockedGmailUsersMessagesSend = jest.fn();
const mockedGmailUsersLabelsList = jest.fn();

jest.mock('googleapis', () => ({
  google: {
    gmail: jest.fn().mockImplementation((version) => ({
      users: {
        messages: {
          send: mockedGmailUsersMessagesSend,
        },
        labels: {
          list: mockedGmailUsersLabelsList,
        },
      },
    })),
  },
}));

describe('GmailService', () => {
  let service: GmailService;
  let mockConfigService = {
    get: jest.fn(),
  };

  const mockReadFileSync = fs.readFileSync as jest.Mock;
  const mockWriteFile = fs.promises.writeFile as jest.Mock;
  
  

  beforeEach(async () => {
    mockReadFileSync.mockReturnValue('{"access_token": "mockedAccessToken", "refresh_token": "mockedRefreshToken"}');
    mockWriteFile.mockResolvedValue(undefined);
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<GmailService>(GmailService);

  });

  describe('getAuthUrl', () => {
    it('should return the Google authentication URL', () => {
      mockConfigService.get
        .mockReturnValueOnce('mocked_client_id')
        .mockReturnValueOnce('mocked_redirect_uri');

      const result = service.getAuthUrl();

      const expectedUrl = `https://accounts.google.com/o/oauth2/v2/auth?scope=https://www.googleapis.com/auth/gmail.send&access_type=offline&include_granted_scopes=true&response_type=code&redirect_uri=mocked_redirect_uri&client_id=mocked_client_id`;
      expect(result).toBe(expectedUrl);
    });
  });

  describe('listLabels', () => {
    it('should return a list of labels', async () => {
      const mockLabels = { data: { labels: [{ name: 'Label1' }, { name: 'Label2' }] } };
      mockedGmailUsersLabelsList.mockResolvedValue(mockLabels);
      
      const labels = await service.listLabels();
      expect(labels).toEqual(['Label1', 'Label2']);
    });
  });

  describe('sendEmail', () => {
    it('should send email without errors', async () => {
      mockedGmailUsersMessagesSend.mockResolvedValue(true);

      await expect(service.sendEmail('test@test.com', 'Test', 'Test Message')).resolves.not.toThrow();
    });

    it('should throw an error if sending fails', async () => {
      mockedGmailUsersMessagesSend.mockRejectedValue(new Error('Email sending failed'));

      await expect(service.sendEmail('test@test.com', 'Test', 'Test Message')).rejects.toThrow('Email sending failed');
    });
  });

  describe('getTokensFromCode', () => {
    it('should return tokens from Google OAuth2 API', async () => {
      const mockCode = 'mockedCode';
      const mockResponse = {
        data: {
          access_token: 'mockedAccessToken',
          refresh_token: 'mockedRefreshToken',
          token_type: 'mockedTokenType',
          expires_in: 3600,
        },
      };

      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.getTokensFromCode(mockCode);

      const expectedResponse = {
        access_token: 'mockedAccessToken',
        refresh_token: 'mockedRefreshToken',
        token_type: 'mockedTokenType',
        expiry_date: expect.any(Number),
      };

      expect(result).toEqual(expectedResponse);
    });
  });

  describe('refreshAccessToken', () => {
    it('should return a refreshed access token', async () => {
      const mockRefreshToken = 'mockedRefreshToken';
      const mockResponse = {
        data: {
          access_token: 'newMockedAccessToken',
          expires_in: 3600,
          token_type: 'mockedTokenType',
        },
      };

      (axios.post as jest.Mock).mockResolvedValue(mockResponse);

      const result = await service.refreshAccessToken(mockRefreshToken);

      expect(result).toBe('newMockedAccessToken');
    });
  });
});
