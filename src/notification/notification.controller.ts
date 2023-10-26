import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { ValidateMongoIdPipe } from '../common/pipes/validate-object-id.pipe';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { Notification } from './entities/notification.entity';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Notification')
@ApiBearerAuth()
@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Insert a new Notification' })
  @ApiResponse({
    status: 201,
    description: 'Returns the details of a notification process.',
    type: Notification,
  })
  @ApiResponse({status:400, description: 'Bad Request'})
  @ApiResponse({status:401, description: 'Unauthorized'})
  @ApiResponse({status:500, description: 'Internal Server Error'})
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve a list of Notifications with optional pagination.' })
  @ApiResponse({status:200, description: 'Get Notifications'})
  findAll(
    @Query() paginationDto: PaginationDto,
  ): Promise<PaginatedResult<Notification>> {
    return this.notificationService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find a Notification for ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the details of a Notification.',
    type: Notification,
  })
  @ApiResponse({status:400, description: 'Bad Request'})
  @ApiResponse({status:401, description: 'Unauthorized'})
  @ApiResponse({status:404, description: 'Not Found'})
  @ApiResponse({status:500, description: 'Internal Server Error'})
  findNotificationById(@Param('id', new ValidateMongoIdPipe()) id: string) {
    return this.notificationService.findNotificationById(id);
  }

  @Get('user/:id')
  @ApiOperation({ summary: 'Find a Notification for User ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the details of a Notifications associated to user',
    type: Notification,
  })
  @ApiResponse({status:400, description: 'Bad Request'})
  @ApiResponse({status:401, description: 'Unauthorized'})
  @ApiResponse({status:404, description: 'Not Found'})
  @ApiResponse({status:500, description: 'Internal Server Error'})
  findNotificationByUserId(@Param('id', ParseUUIDPipe) id: string) {
    return this.notificationService.findNotificationByUserId(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a Notification' })
  @ApiResponse({
    status: 200,
    description: 'Returns the details of a Notification',
    type: Notification,
  })
  @ApiResponse({status:400, description: 'Bad Request'})
  @ApiResponse({status:401, description: 'Unauthorized'})
  @ApiResponse({status:404, description: 'Not Found'})
  @ApiResponse({status:500, description: 'Internal Server Error'})
  update(
    @Param('id', new ValidateMongoIdPipe()) id: string,
    @Body() updateNotificationDto: UpdateNotificationDto,
  ) {
    return this.notificationService.update(id, updateNotificationDto);
  }

  @Patch('mark-read/:id')
  @ApiOperation({ summary: 'Mark as read Notification' })
  @ApiResponse({
    status: 200,
    description: 'Returns the details of a Notification',
    type: Notification,
  })
  @ApiResponse({status:400, description: 'Bad Request'})
  @ApiResponse({status:401, description: 'Unauthorized'})
  @ApiResponse({status:404, description: 'Not Found'})
  @ApiResponse({status:500, description: 'Internal Server Error'})
  async markAsRead(@Param('id', new ValidateMongoIdPipe()) id: string) {
    return this.notificationService.setReadStatus(id, true);
  }

  @Patch('mark-unread/:id')
  @ApiOperation({ summary: 'Mark as unread Notification' })
  @ApiResponse({
    status: 200,
    description: 'Returns the details of a Notification',
    type: Notification,
  })
  @ApiResponse({status:400, description: 'Bad Request'})
  @ApiResponse({status:401, description: 'Unauthorized'})
  @ApiResponse({status:404, description: 'Not Found'})
  @ApiResponse({status:500, description: 'Internal Server Error'})
  async markAsUnread(@Param('id', new ValidateMongoIdPipe()) id: string) {
    return this.notificationService.setReadStatus(id, false);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a Notification ' })
  @ApiResponse({status: 200})
  @ApiResponse({status:400, description: 'Bad Request'})
  @ApiResponse({status:401, description: 'Unauthorized'})
  @ApiResponse({status:404, description: 'Not Found'})
  @ApiResponse({status:500, description: 'Internal Server Error'})
  remove(@Param('id', new ValidateMongoIdPipe()) id: string) {
    return this.notificationService.remove(id);
  }
}
