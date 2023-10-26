import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { GmailService } from '../gmail/gmail.service';
import { LoggerService } from '../common/logger/logger.service';
import { ApiBearerAuth, ApiResponse, ApiTags,ApiOperation,ApiBody } from '@nestjs/swagger';
import { SendEmailRequestDto } from './dto/send-email-request.dto';
import { Public } from '../auth/decorators/public.decorator';
@ApiTags('Gmail')
@ApiBearerAuth()
@Controller('gmail')
export class GmailController {
  constructor(
    private readonly logger: LoggerService,
    private readonly gmailService: GmailService,
  ) {}

  @Post('sendEmail')
  @ApiOperation({ summary: 'Send an email using Gmail' })
  @ApiResponse({ status: 201, description: 'Email sent successfully' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  @ApiBody({
    description: 'Email Data',
    type: SendEmailRequestDto,
  })
  async sendEmail(@Body() body): Promise<any> {
    try {
      await this.gmailService.sendEmail(body.to, body.subject, body.message);
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
  @Get('google/auth')
  @ApiOperation({ summary: 'Redirect to Google Auth' })
  @ApiResponse({ status: 200, description: 'URL to Google Auth' })
  redirectToGoogleAuth(): string {
    return this.gmailService.getAuthUrl();
  }

  @Public()
  @Get('google/callback')
  @ApiOperation({ 
    summary: 'Handle Google Auth Callback',
    description: 'Handles the authentication callback from Google automatically.'
  })
  async handleGoogleCallback(@Query('code') code: string): Promise<any> {
    console.log('Callback hit with code:', code);
    try {
        await this.gmailService.getTokensFromCode(code);
        return { status: 'success', message: 'Autentication successfully and tokens saving.' };
    } catch (error) {
        this.logger.error('Error handling Google callback', error);
        throw new HttpException({
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: 'Error in the Google authentication process.',
        }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
  
}
