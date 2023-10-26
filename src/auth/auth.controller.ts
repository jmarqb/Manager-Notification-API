import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { ApiBadRequestResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('test-token')
  @ApiOperation({
    summary: 'Generate a Test Token (Development Only)',
    description:
      'Endpoint exclusively for development purposes to generate a valid token for testing other endpoints. It is strongly recommended to disable this endpoint in any other environment than development.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Successfully generated a test token.', 
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: 'A valid JWT token for testing purposes.'
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Bad request if data validation fails.' })
  getTestToken() {
    return this.authService.getTestToken();
  }
}
