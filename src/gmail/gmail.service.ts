import { Injectable } from '@nestjs/common';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import axios from 'axios';

@Injectable()
export class GmailService {
  private static SCOPES = ['https://www.googleapis.com/auth/gmail.send'];
  private static TOKEN_PATH = path.join(process.cwd(), 'token.json');
  private oAuth2Client: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    this.oAuth2Client = new OAuth2Client(clientId, clientSecret);
    try {
      const token = fs.readFileSync(GmailService.TOKEN_PATH, 'utf-8');
      this.oAuth2Client.setCredentials(JSON.parse(token));
    } catch (error) {
      console.error('Error setting up token during instantiation:', error);
    }
  }

  async listLabels(): Promise<string[]> {
    const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });
    const res = await gmail.users.labels.list({ userId: 'me' });
    return res.data.labels?.map((label) => label.name) || [];
  }

  async sendEmail(to: string, subject: string, message: string): Promise<void> {
    // Verify if credentials config exists 
    if (!this.oAuth2Client.credentials || !this.oAuth2Client.credentials.access_token) {
        try {
            const token = fs.readFileSync(GmailService.TOKEN_PATH, 'utf-8');
            this.oAuth2Client.setCredentials(JSON.parse(token));
        } catch (error) {
            throw new Error('Failed to load token for email sending.');
        }
    }

    const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });
    const raw = this.createRawEmail(
      to,
      this.configService.get<string>('YOUR_EMAIL_ADDRESS'),
      subject,
      message,
    );
    
    await gmail.users.messages.send({
      userId: 'me',
      requestBody: { raw },
    });
}

  private createRawEmail(
    to: string,
    from: string,
    subject: string,
    message: string,
  ): string {
    const email = `To: ${to}\nFrom: ${from}\nSubject: ${subject}\n\n${message}`;
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    return encodedEmail;
  }

  getAuthUrl(): string {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const redirectUri = this.configService.get<string>('REDIRECT_URI');
    const scope = 'https://www.googleapis.com/auth/gmail.send';

    return `https://accounts.google.com/o/oauth2/v2/auth?scope=${scope}&access_type=offline&include_granted_scopes=true&response_type=code&redirect_uri=${redirectUri}&client_id=${clientId}`;
  }

  async getTokensFromCode(code: string): Promise<any> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');
    const redirectUri = this.configService.get<string>('REDIRECT_URI');

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const { access_token, refresh_token } = response.data;

    // Store tokens in token.json
    const tokenData = {
      access_token,
      refresh_token,
      token_type: response.data.token_type,
      expiry_date: new Date().getTime() + response.data.expires_in * 1000,
    };

    await fs.promises.writeFile(
      GmailService.TOKEN_PATH,
      JSON.stringify(tokenData),
      'utf-8',
    );
    this.oAuth2Client.setCredentials(tokenData);

    return tokenData;
  }

  async refreshAccessToken(refreshToken: string): Promise<string> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GOOGLE_CLIENT_SECRET');

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    });

    return response.data.access_token;
  }
}
