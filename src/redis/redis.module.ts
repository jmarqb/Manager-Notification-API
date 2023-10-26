import { Module, Global, DynamicModule } from '@nestjs/common';
import RedisClient from 'ioredis';
import { LoggerService } from '../common/logger/logger.service';

@Global()
@Module({
  providers: [LoggerService],
})
export class RedisModule {
  static register(): DynamicModule {
    const providers = [
      {
        provide: 'REDIS_CLIENT',
        useFactory: () => {
          const client = new RedisClient({
            host: process.env.REDIS_HOST,
            port: Number(process.env.REDIS_PORT),
          });
          client.on('connect', () => console.log('Connect to Redis'));
          client.on('error', (error) => console.error('Error in Redis', error));
          return client;
        },
      },
    ];

    return {
      module: RedisModule,
      providers: providers,
      exports: providers,
    };
  }
}
