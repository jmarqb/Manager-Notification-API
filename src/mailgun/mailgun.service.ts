import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
const formData = require('form-data');
import Mailgun from 'mailgun.js';

@Injectable()
export class MailgunService {
  private mg;

  constructor(private configService: ConfigService) {
    const mailgun = new Mailgun(formData);
    this.mg = mailgun.client({
      username: 'api',
      key: this.configService.get<string>('MAILGUN_API_KEY'),
      url: 'https://api.mailgun.net'
    });
  }

  async sendEmail(to: string, subject: string, text: string, html?: string): Promise<any> {
    const data = {
      //from: this.configService.get<string>('MAILGUN_FROM_EMAIL'),
      from: 'mailgun@sandbox-123.mailgun.org',
      to: to,
      subject: subject,
      text: text,
      html: html
    };

    return this.mg.messages.create(this.configService.get<string>('MAILGUN_DOMAIN'), data);
  }

 
}
