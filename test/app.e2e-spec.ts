import * as dotenv from 'dotenv';
dotenv.config();
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

import * as request from 'supertest';
import { AppModule } from './../src/app.module';

import {
  startMongoContainer,
  startRedisContainer,
  stopMongoContainer,
  stopRedisContainer,
} from './test-helpers';

import { NotificationModule } from '../src/notification/notification.module';
import { RedisModule } from '../src/redis/redis.module';

import {
  DeliveryChannel,
  NotificationType,
} from '../src/notification/enums/enum.notification';

import { GmailModule } from '../src/gmail/gmail.module';
import { MailgunModule } from '../src/mailgun/mailgun.module';
import { GmailService } from '../src/gmail/gmail.service';
import { MailgunService } from '../src/mailgun/mailgun.service';
import Redis from 'ioredis';

let app: INestApplication;

const mockJwtService = {
  verify: jest.fn().mockImplementation(() => ({
    id: 'some-mocked-user-id',
    role: ['admin'],
  })),
};

const mockConfigService = {
  get: jest.fn().mockImplementation((key: string) => {
    return process.env[key];
  }),
};

const mockMailgunService = {
  sendEmail: jest.fn().mockResolvedValue({ message: 'Mailgun email sent!' }),
};

const mockGmailService = {
  sendEmail: jest.fn().mockResolvedValue({ message: 'Gmail email sent!' }),
};

const ERROR_MSG = {
  UNAUTHORIZED_ERROR: 'Unauthorized',
  UNAUTHORIZED_MESSAGE: 'Access unauthorized',
  BAD_REQUEST_ERROR: 'Bad Request',
  INVALID_MONGODB_ID_MESSAGE: 'Invalid MongoDB Id',
  INVALID_USER_ID_MESSAGE: 'Validation failed (uuid is expected)',
  NOT_FOUND_ERROR: 'Not Found',
  ELEMENT_NOT_FOUND_MESSAGE: 'Element not found in the database.',
  ELEMENT_DUPLICATE_MESSAGE: 'The element already exists in database.',
};

describe('AppController (e2e)', () => {
  let mongoUri;
  let clientRedis;

  beforeAll(async () => {
    jest.setTimeout(60000);

    mongoUri = await startMongoContainer();
    const redisConfig = await startRedisContainer();

    console.log(redisConfig);

    process.env.REDIS_HOST = redisConfig.host;
    process.env.REDIS_PORT = redisConfig.port.toString();

    clientRedis = new Redis(+process.env.REDIS_PORT, process.env.REDIS_HOST);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        MongooseModule.forRoot(mongoUri, { autoCreate: true }),

        RedisModule.register(),

        AppModule,
        NotificationModule,
        GmailModule,
        MailgunModule,
      ],
      providers: [JwtService, ConfigService, GmailService, MailgunService],
    })
      .overrideProvider(JwtService)
      .useValue(mockJwtService)
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .overrideProvider(MailgunService)
      .useValue(mockMailgunService)
      .overrideProvider(GmailService)
      .useValue(mockGmailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  }, 60000);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  async function createNotification(app) {
    let createdNotification;
    let status;

    await request(app.getHttpServer())
      .post('/notification')
      .set('Authorization', 'Bearer any-fake-token-value')
      .send({
        eventEmitted: 'event_test',
        deliveryChannel: DeliveryChannel.System,
        userId: "c573e986-fb91-475c-9043-1b4c05bec643",
        notificationType: NotificationType.Batch,
        content: 'content',
      })
      .expect((res) => {
        createdNotification = res.body;
        status = res.statusCode;
      });

    return { createdNotification, status };
  }

  async function getIdNotification() {
    let id;
    //create a notification in database
    await createNotification(app);

    await request(app.getHttpServer())
      .get('/notification')
      .set('Authorization', 'Bearer any-fake-token-value')
      .expect(200)
      .expect((res) => {
        id = res.body.items[0]._id;
      });
    return id;
  }

  async function getUserId() {
    let userId;
    //create a notification in database
    await createNotification(app);

    await request(app.getHttpServer())
      .get('/notification')
      .set('Authorization', 'Bearer any-fake-token-value')
      .expect(200)
      .expect((res) => {
        userId = res.body.items[0].systemMetadata.userId;
      });
    return userId;
  }

  describe('/notification (POST)', () => {
    const dto = {
      eventEmitted: 'event_test',
      deliveryChannel: DeliveryChannel.Email,
      email: 'test@gmail.com',
      notificationType: NotificationType.Batch,
      content: 'content',
    };

    it('should unauthorized if not exist a token', async () => {
      await request(app.getHttpServer())
        .post('/notification')
        .send(dto)
        .expect(401)
        .expect((res) => {
          expect(res.body.error).toBe(ERROR_MSG.UNAUTHORIZED_ERROR);
          expect(res.body.message).toBe(ERROR_MSG.UNAUTHORIZED_MESSAGE);
        });
    });

    it('should BadRequest if email and userId send together', async () => {
      await request(app.getHttpServer())
        .post('/notification')
        .set('Authorization', 'Bearer any-fake-token-value')
        .send({ ...dto, userId: 'c573e986-fb91-475c-9043-1b4c05bec643' })
        .expect(400);
    });

    it('should BadRequest if send a empty data', async () => {
      await request(app.getHttpServer())
        .post('/notification')
        .set('Authorization', 'Bearer any-fake-token-value')
        .send({})
        .expect(400);
    });

    it('should create and proccess Email- Batch notification', async () => {
      await request(app.getHttpServer())
        .post('/notification')
        .set('Authorization', 'Bearer any-fake-token-value')
        .send(dto)
        .expect(201);
    });

    it('should create and proccess Email - Instant notification', async () => {
      await request(app.getHttpServer())
        .post('/notification')
        .set('Authorization', 'Bearer any-fake-token-value')
        .send({
          eventEmitted: 'event_test',
          deliveryChannel: DeliveryChannel.Email,
          email: 'test@gmail.com',
          notificationType: NotificationType.Instant,
          content: 'content',
        })
        .expect(201);
    });

    it('should create and proccess System - Instant or Batch notification', async () => {

      await request(app.getHttpServer())
        .post('/notification')
        .set('Authorization', 'Bearer any-fake-token-value')
        .send({
          eventEmitted: 'event_test',
          deliveryChannel: DeliveryChannel.System,
          userId: 'c573e986-fb91-475c-9043-1b4c05bec643',
          notificationType: NotificationType.Instant,
          content: 'content',
        })
        .expect(201)
    });

    it('should BadRequest if email provider not supported', async () => {
      await request(app.getHttpServer())
        .post('/notification')
        .set('Authorization', 'Bearer any-fake-token-value')
        .send({
          eventEmitted: 'event_test',
          deliveryChannel: DeliveryChannel.Email,
          email: 'test@otro_provider.com',
          notificationType: NotificationType.Batch,
          content: 'content',
        })
        .expect(400)
    });
  });

  describe('/notification (GET)', () => {
    it('should respond with paginated notifications', async () => {
      await createNotification(app);
      await request(app.getHttpServer())
        .get('/notification')
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('items');
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('currentPage');
          expect(res.body).toHaveProperty('totalPages');

          expect(res.body.items).toBeInstanceOf(Array);
          expect(res.body.items[0]).toHaveProperty('_id');
          expect(res.body.items[0]).toHaveProperty('date');
          expect(res.body.items[0]).toHaveProperty('eventEmitted');
          expect(res.body.items[0]).toHaveProperty('deliveryChannel');
          expect(res.body.items[0]).toHaveProperty('notificationType');
          expect(res.body.items[0]).toHaveProperty('systemMetadata');
          expect(res.body.items[0]).toHaveProperty('read');
          expect(res.body.items[0].systemMetadata).toBeInstanceOf(Object);
        });
    });

    it('should respond with an array of notifications', async () => {
      await request(app.getHttpServer())
        .get('/notification')
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toBeInstanceOf(Array);
        });
    });

    it('should respect the limit and offset parameters', async () => {

      for (let i = 0; i <= 11; i++) {
        //create a notification in database
        await createNotification(app);
      }

      await request(app.getHttpServer())
        .get('/notification?limit=5&offset=5')
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(200)
        .expect((res) => {
          expect(res.body.items.length).toBe(5);
        });
    });

    it('should respect the provided limit', async () => {
      const limit = 5;
      const response = await request(app.getHttpServer())
        .get(`/notification?limit=${limit}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(200);

      expect(response.body.items.length).toBeLessThanOrEqual(limit);
    });

    it('should respect the provided offset', async () => {
      for (let i = 0; i <= 11; i++) {
        //create a notification in database
        await createNotification(app);
      }

      const limit = 5;
      const offset = 5;

      const firstResponse = await request(app.getHttpServer())
        .get(`/notification?limit=${limit}&offset=${offset}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(200);

      const secondResponse = await request(app.getHttpServer())
        .get(`/notification?limit=${limit}&offset=${offset + limit}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(200);

      expect(firstResponse.body.items[0]._id).not.toBe(secondResponse.body.items[0]._id);
    });

    it('should return the correct total count and pages', async () => {
      const limit = 5;
      const response = await request(app.getHttpServer())
        .get(`/notification?limit=${limit}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(200);

      expect(response.body.total).toBeDefined();
      expect(response.body.totalPages).toBeDefined();
      expect(response.body.totalPages).toBe(Math.ceil(response.body.total / limit));
    });

    it('should use default values if limit and offset are not provided', async () => {
      const response = await request(app.getHttpServer())
        .get('/notification')
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(200);

      expect(response.body.items.length).toBeLessThanOrEqual(10); // default limit
      expect(response.body.currentPage).toBe(1); // default page
    });
  });

  describe('/notification/:id (GET)', () => {
    it('should retrieve a Notification by its id', async () => {
      const id = await getIdNotification();

      await request(app.getHttpServer())
        .get(`/notification/${id}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(200)
        .expect((res) => {
          expect(res.body._id).toBe(id);
          expect(res.body).toHaveProperty('_id');
          expect(res.body).toHaveProperty('date');
          expect(res.body).toHaveProperty('eventEmitted');
          expect(res.body).toHaveProperty('deliveryChannel');
          expect(res.body).toHaveProperty('notificationType');
          expect(res.body).toHaveProperty('systemMetadata');
          expect(res.body).toHaveProperty('read');
        });
    });

    it('should return bad request if id is not a valid MongoId', async () => {
      const invalidId = 'some-invalidId';
      await request(app.getHttpServer())
        .get(`/notification/${invalidId}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toBe(ERROR_MSG.BAD_REQUEST_ERROR);
          expect(res.body.message).toBe(ERROR_MSG.INVALID_MONGODB_ID_MESSAGE);
        });
    });

    it('should return not found if Notification does not exist', async () => {
      const nonExistingNotificationId = '6522b214dbabfa715eb97176'; //This MongoId not EXists
      await request(app.getHttpServer())
        .get(`/notification/${nonExistingNotificationId}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(404)
        .expect((res) => {
          expect(res.body.error).toBe(ERROR_MSG.NOT_FOUND_ERROR);
          expect(res.body.message).toBe(ERROR_MSG.ELEMENT_NOT_FOUND_MESSAGE);
        });
    });
  });
  describe('/notification/user/:id (GET)', () => {
    it('should retrieve a Notifications by its userid', async () => {

      const userId = await getUserId();

      await request(app.getHttpServer())
        .get(`/notification/user/${userId}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(200)
        .expect((res) => {
          expect(res.body).toBeInstanceOf(Array);
          expect(res.body[0]).toHaveProperty('_id');
          expect(res.body[0]).toHaveProperty('date');
          expect(res.body[0]).toHaveProperty('eventEmitted');
          expect(res.body[0]).toHaveProperty('deliveryChannel');
          expect(res.body[0]).toHaveProperty('notificationType');
          expect(res.body[0]).toHaveProperty('systemMetadata');
          expect(res.body[0]).toHaveProperty('read');
        });
    });

    it('should return bad request if userId is not a UUID', async () => {
      const invalidId = 'some-invalidId';
      await request(app.getHttpServer())
        .get(`/notification/user/${invalidId}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toBe(ERROR_MSG.BAD_REQUEST_ERROR);
          expect(res.body.message).toBe(ERROR_MSG.INVALID_USER_ID_MESSAGE);
        });
    });

    it('should return not found if userId does not exist', async () => {
      const nonExistingNotificationId = 'c453e986-fb91-475c-9043-154c09bec643'; //This UUID not EXists
      await request(app.getHttpServer())
        .get(`/notification/user/${nonExistingNotificationId}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(404)
        .expect((res) => {
          expect(res.body.error).toBe(ERROR_MSG.NOT_FOUND_ERROR);
          expect(res.body.message).toBe(ERROR_MSG.ELEMENT_NOT_FOUND_MESSAGE);
        });
    });
  });

  describe('/notification/:id (PATCH)', () => {
    it('should unauthorized if not exist a token', async () => {

      //create a notification in database
      const id = await getIdNotification();

      await request(app.getHttpServer())
        .patch(`/notification/${id}`)
        .send({
          "eventEmitted": "updateNotification",
        })
        .expect(401)
        .expect((res) => {
          expect(res.body.error).toBe(ERROR_MSG.UNAUTHORIZED_ERROR)
          expect(res.body.message).toBe(ERROR_MSG.UNAUTHORIZED_MESSAGE)
        });
    });

    it('should return bad request if id is not a valid MongoId', async () => {
      const invalidId = 'some-invalidId';
      await request(app.getHttpServer())
        .patch(`/notification/${invalidId}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .send({
          "eventEmitted": "UpdatedEventEmitted",
        })
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toBe(ERROR_MSG.BAD_REQUEST_ERROR);
          expect(res.body.message).toBe(ERROR_MSG.INVALID_MONGODB_ID_MESSAGE);
        });
    });

    it('should return not found if notification does not exist', async () => {
      const nonExistingnotificationId = '6522b214dbabfa715eb97176'; //This MongoId not EXists
      await request(app.getHttpServer())
        .patch(`/notification/${nonExistingnotificationId}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .send({
          "eventEmitted": "UpdateEventEmitted",
        })
        .expect(404)
        .expect((res) => {
          expect(res.body.error).toBe(ERROR_MSG.NOT_FOUND_ERROR);
          expect(res.body.message).toBe(ERROR_MSG.ELEMENT_NOT_FOUND_MESSAGE);
        });

    });

    it('should Updated notification', async () => {
      //create a notification and get id
      const id = await getIdNotification();

      await request(app.getHttpServer())
        .patch(`/notification/${id}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .send({
          "eventEmitted": "UpdateEventEmitted",
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('_id');
          expect(res.body).toHaveProperty('date');
          expect(res.body).toHaveProperty('eventEmitted');
          expect(res.body).toHaveProperty('deliveryChannel');
          expect(res.body).toHaveProperty('notificationType');
          expect(res.body).toHaveProperty('systemMetadata');
          expect(res.body).toHaveProperty('read');

        });

    });

  });

  describe('/notification/mark-read/:id (PATCH)', () => {
    it('should unauthorized if not exist a token', async () => {

      //create a notification in database
      const id = await getIdNotification();

      await request(app.getHttpServer())
        .patch(`/notification/mark-read/${id}`)
        .expect(401)
        .expect((res) => {
          expect(res.body.error).toBe(ERROR_MSG.UNAUTHORIZED_ERROR)
          expect(res.body.message).toBe(ERROR_MSG.UNAUTHORIZED_MESSAGE)
        });
    });

    it('should return bad request if id is not a valid MongoId', async () => {
      const invalidId = 'some-invalidId';
      await request(app.getHttpServer())
        .patch(`/notification/mark-read/${invalidId}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toBe(ERROR_MSG.BAD_REQUEST_ERROR);
          expect(res.body.message).toBe(ERROR_MSG.INVALID_MONGODB_ID_MESSAGE);
        });
    });

    it('should return not found if notification does not exist', async () => {
      const nonExistingnotificationId = '6522b214dbabfa715eb97176'; //This MongoId not EXists
      await request(app.getHttpServer())
        .patch(`/notification/mark-read/${nonExistingnotificationId}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(404)
        .expect((res) => {
          expect(res.body.error).toBe(ERROR_MSG.NOT_FOUND_ERROR);
          expect(res.body.message).toBe(ERROR_MSG.ELEMENT_NOT_FOUND_MESSAGE);
        });

    });

    it('should mark read the notification ', async () => {

      //create a notification in database
      const id = await getIdNotification();

      await request(app.getHttpServer())
        .patch(`/notification/mark-read/${id}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(200)
        .expect((res) => {
          expect(res.body._id).toBe(id);
          expect(res.body).toHaveProperty('_id');
          expect(res.body).toHaveProperty('date');
          expect(res.body).toHaveProperty('eventEmitted');
          expect(res.body).toHaveProperty('deliveryChannel');
          expect(res.body).toHaveProperty('notificationType');
          expect(res.body).toHaveProperty('systemMetadata');
          expect(res.body).toHaveProperty('read');
          expect(res.body.read).toEqual(true)
        });
    });

  });

  describe('/notification/mark-unread/:id (PATCH)', () => {
    it('should unauthorized if not exist a token', async () => {

      //create a notification in database
      const id = await getIdNotification();

      await request(app.getHttpServer())
        .patch(`/notification/mark-unread/${id}`)
        .expect(401)
        .expect((res) => {
          expect(res.body.error).toBe(ERROR_MSG.UNAUTHORIZED_ERROR)
          expect(res.body.message).toBe(ERROR_MSG.UNAUTHORIZED_MESSAGE)
        });
    });

    it('should return bad request if id is not a valid MongoId', async () => {
      const invalidId = 'some-invalidId';
      await request(app.getHttpServer())
        .patch(`/notification/mark-unread/${invalidId}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(400)
        .expect((res) => {
          expect(res.body.error).toBe(ERROR_MSG.BAD_REQUEST_ERROR);
          expect(res.body.message).toBe(ERROR_MSG.INVALID_MONGODB_ID_MESSAGE);
        });
    });

    it('should return not found if notification does not exist', async () => {
      const nonExistingnotificationId = '6522b214dbabfa715eb97176'; //This MongoId not EXists
      await request(app.getHttpServer())
        .patch(`/notification/mark-unread/${nonExistingnotificationId}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(404)
        .expect((res) => {
          expect(res.body.error).toBe(ERROR_MSG.NOT_FOUND_ERROR);
          expect(res.body.message).toBe(ERROR_MSG.ELEMENT_NOT_FOUND_MESSAGE);
        });

    });

    it('should mark unread the notification ', async () => {

      //create a notification in database
      const id = await getIdNotification();

      await request(app.getHttpServer())
        .patch(`/notification/mark-unread/${id}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(200)
        .expect((res) => {
          expect(res.body._id).toBe(id);
          expect(res.body).toHaveProperty('_id');
          expect(res.body).toHaveProperty('date');
          expect(res.body).toHaveProperty('eventEmitted');
          expect(res.body).toHaveProperty('deliveryChannel');
          expect(res.body).toHaveProperty('notificationType');
          expect(res.body).toHaveProperty('systemMetadata');
          expect(res.body).toHaveProperty('read');
          expect(res.body.read).toEqual(false)
        });
    });

  });

  describe('/notification/:id (DELETE)', () => {
    it('should deleted notification', async () => {
      //create a notification and get id
      const id = await getIdNotification();

      await request(app.getHttpServer())
        .delete(`/notification/${id}`)
        .set('Authorization', 'Bearer any-fake-token-value')
        .expect(200);
    });

    it('should unauthorized if not exist a token', async () => {
      //create a notification and get id
      const id = await getIdNotification();
      await request(app.getHttpServer())
        .delete(`/notification/${id}`)
        .expect(401)
        .expect((res) => {
          expect(res.body.error).toBe(ERROR_MSG.UNAUTHORIZED_ERROR);
          expect(res.body.message).toBe(ERROR_MSG.UNAUTHORIZED_MESSAGE);
        });
    });

    it('should return bad request if id is not a valid MongoId', async () => {
        const invalidId = 'some-invalidId';
        await request(app.getHttpServer())
            .delete(`/notification/${invalidId}`)
            .set('Authorization', 'Bearer any-fake-token-value')
            .expect(400)
            .expect((res) => {
                expect(res.body.error).toBe(ERROR_MSG.BAD_REQUEST_ERROR);
                expect(res.body.message).toBe(ERROR_MSG.INVALID_MONGODB_ID_MESSAGE);
            });
    });

    it('should return not found if notification does not exist', async () => {
        const nonExistingnotificationId = '6522b214dbabfa715eb97176'; //This MongoId not EXists
        await request(app.getHttpServer())
            .delete(`/notification/${nonExistingnotificationId}`)
            .set('Authorization', 'Bearer any-fake-token-value')
            .expect(404)
            .expect((res) => {
                expect(res.body.error).toBe(ERROR_MSG.NOT_FOUND_ERROR);
                expect(res.body.message).toBe(ERROR_MSG.ELEMENT_NOT_FOUND_MESSAGE);
            });

    });
  });

  afterAll(async () => {
    await clientRedis.quit();
    await stopMongoContainer();
    await stopRedisContainer();
    await app.close();
  });
});
