import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { MailgunService } from './mailgun.service';
import { LoggerService } from '../common/logger/logger.service';
import { 
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody 
} from '@nestjs/swagger';

@ApiTags('Mailgun')
@ApiBearerAuth()
@Controller('mailgun')
export class MailgunController {
  constructor(
    private readonly mailgunService: MailgunService,
    private readonly logger: LoggerService,
  ) {}

  @Post('sendEmail')
  @ApiOperation({ summary: 'Send an email using Mailgun' })
  @ApiResponse({ status: 200, description: 'Email sent successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiBody({
    description: 'Email Data',
    type: 'object',
    schema: {
      example: {
        to: "test@gmail.com",
        subject: "email test",
        message: "content"
      }
    }
  })
  async sendEmail(@Body() body): Promise<any> {
    try {
      await this.mailgunService.sendEmail(body.to, body.subject, body.message);
      return { status: 'Email sent successfully!' };
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'There was an error processing the request.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
