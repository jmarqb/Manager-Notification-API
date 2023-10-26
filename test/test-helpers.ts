import { GenericContainer } from 'testcontainers';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const redis = require("async-redis");

let mongodbContainer;
export async function startMongoContainer() {
  if (!mongodbContainer) { // Only start the container if not yet executed
    console.log('Starting MongoDBContainer container...');

    const mongoContainer = new GenericContainer("mongo:6.0.1");
    mongodbContainer = await mongoContainer.withExposedPorts(27017).start();
    
    const port = mongodbContainer.getMappedPort(27017);
    const mongoUri = `mongodb://${mongodbContainer.getHost()}:${port}/notifications`;

    return mongoUri;
  } else {
    console.log('MongoDBContainer container already running.');
    const port = mongodbContainer.getMappedPort(27017);
    return `mongodb://${mongodbContainer.getHost()}:${port}/notifications`;
  }
}

export async function stopMongoContainer() {
  if (mongodbContainer) {
    await mongodbContainer.stop();
    mongodbContainer = null; // Clean the instance after stop 
    console.log('Container stopped.');
  }
}

//Test container redis
let redisContainer;
let redisClient;

export async function startRedisContainer() {
  if (!redisContainer) {
    console.log('Starting redisContainer container...');

    // Initialize the redis container
    const contenedor = new GenericContainer("redis:alpine");
    redisContainer = await contenedor.withExposedPorts(6379).start();

    // Create a client redis conecction using the container credentiasl 
    const port = redisContainer.getMappedPort(6379);
    const host = redisContainer.getHost();
    
    redisClient = redis.createClient(port,host);

    console.log('redisContainer started and connected.');
    return {
      host, 
      port,       
    };

  } else {
    console.log('redisContainer container already running.');
  }
}

export async function stopRedisContainer() {
  if (redisContainer) {
    console.log('Stopping redisContainer container...');

    await redisClient.quit();

    await redisContainer.stop();

    redisClient = null;
    redisContainer = null;

    console.log('Container stopped.');
  }
}