<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

## Table of Contents
1. [General Info](#general-info)
2. [Technologies](#technologies)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Running the Application](#running-the-application)
7. [Docker Stack](#docker-stack)
8. [Test](#test)
9. [API Documentation](#api-documentation)
10. [Contact & Follow](#contact-&-follow)

### General Info
***
Manager Notification API

The "Manager Notification API" is a sophisticated microservice designed to receive, process, and deliver notifications through various channels, such as email or internal systems. This system can handle notifications both instantly and batched, allowing for optimal flexibility and efficiency.


### Technologies
***
A list of technologies used within the project:

* @nestjs/common (Version 10.0.0): Essential for creating modules, controllers, services, and other basic elements in the NestJS framework.

* @nestjs/config (Version 3.1.1): Part of the NestJS ecosystem, used specifically for configuration management.

* @nestjs/core (Version 10.0.0): Core functionalities and building blocks of the NestJS framework.

* @nestjs/swagger (Version 7.1.13): Integrated to aid in the creation of API documentation and define the structure of the API endpoints.

* class-validator (Version 0.14.0) and class-transformer (Version 0.5.1): Used in tandem for runtime data validation and transformation, ensuring data integrity.

* jest (Version 29.5.0) with ts-jest (Version 29.1.0) and supertest (Version 6.3.3): Testing utilities for writing unit and end-to-end tests. The combination ensures that the server behaves as expected.

* @testcontainers/redis and mongodb : Provides ephemeral instances of redis and mongo for testing, ensuring that tests are run in a consistent and isolated environment.

* TypeScript (Version 5.1.3): The project is written in TypeScript to ensure type safety and improved readability.

* @nestjs/jwt (Version 10.1.1):Used for JWT-based authentication within the NestJS ecosystem.

* @nestjs/mongoose (Version 10.0.1):Provides functionalities for integration with Mongoose, facilitating operations with MongoDB databases.

* async-redis (Version 2.0.0) and ioredis (Version 5.3.2):Libraries that ease the connection and operations with Redis, an in-memory database.

* cache-manager (Version 5.2.4):A library that provides flexible caching solutions.

* googleapis (Version 105.0.0):The official client for interacting with Google APIs.

* mailgun.js (Version 9.3.0):SDK for interacting with the Mailgun email sending service.

* @google-cloud/local-auth (Version 2.1.0):Facilitates local authentication for development with Google Cloud APIs.

* winston (Version 3.11.0): A logging library for handling logs efficiently and with different transports.

### Prerequisites
***
Before you begin, ensure you have met the following requirements:
* You have installed node.js and npm.
* You have MongoDB and Redis running.
* Docker and Docker Compose installed(if you prefer to run the application with Docker or to run e2e tests with testcontainers)

## Installation

To install API, follow these steps:

```bash
$ git clone https://github.com/jmarqb/Manager-Notification-API.git --config core.autocrlf=input
$ cd Manager-Notification-API
$ npm install
```

## Configuration

 * Copy the contents of env-example into a new .env file and update it with your Credentials for connection parameters or use the values in the env-example. **To offer a quick way to test the application, an example Gmail account is provided in the env-example for development and testing purposes. The details and credentials are shared, and users are asked not to misuse it. It is shared solely to ensure and expedite Google's OAuth for this user and to guarantee the GMAIL API mechanism from the beginning on the part of the application.**

* Remember, you must have a running instance of MongoDB (https://www.mongodb.com/try/download/community) and Redis (https://redis.io/download/) 

## Running the Application

To run Manager Notification API, use the following command:

```bash
$ npm run build
$ npm run start
```

This will start the server and the application will be available at http://localhost:<your_port>

For Example: `http://localhost:3000/api/doc`

We recommend you visit the section [API Documentation](#api-documentation)


## Docker Stack

If you have Docker and Docker Compose installed, running the application becomes even easier. First, clone the repository and navigate to the project directory:

```bash
$ git clone https://github.com/jmarqb/Manager-Notification-API.git --config core.autocrlf=input
$ cd Manager-Notification-API
$ npm install
```

* Copy the contents of env-example into a new .env file and update it with your Credentials for connection parameters or use the values in the env-example. **To offer a quick way to test the application, an example Gmail account is provided in the env-example for development and testing purposes. The details and credentials are shared, and users are asked not to misuse it. It is shared solely to ensure and expedite Google's OAuth for this user and to guarantee the GMAIL API mechanism from the beginning on the part of the application.**


* Ensure that the wait-for-it.sh script has execution permissions:

```
chmod +x wait-for-it.sh
```

* To start the application with Docker:

```
docker-compose up --build
```

This will start the server and the application will be available at http://localhost:<your_port>

For Example: `http://localhost:3000/api/doc`

## Test

To ensure everything runs smoothly, this project includes both Unit and Integration tests using the tools Jest and Supertest. To execute them, follow these steps:

Dependency Installation: Before running the tests, ensure you've installed all the project dependencies. If you haven't done so yet, you can install them by executing the command `npm install`.

Unit Tests: To run unit tests on controllers and services, use the following command:

```bash
$ npm run test
```

Integration Tests (e2e): These tests verify the complete flow and functioning of the application. To run them, use the command:

```bash
$ npm run test:e2e
```

It's important to highlight that these e2e tests utilize a Docker testcontainer with a MongoDB and Redis databases. This databases is specifically created to test all the application's endpoints and the related database operations. Once the tests are completed, the databases are automatically removed.

## API Documentation

For more detailed information about the workflow of the API , endpoints, responses and status codes, visit the API documentation.

You can access the API documentation at `localhost:<port>/api/doc` 
For example, when running the server locally, it will be available at localhost:3000/api/doc

---
## Contact & Follow

Thank you for checking out my project! If you have any questions, feedback or just want to connect, here's where you can find me:

**GitHub**: [jmarqb](https://github.com/jmarqb)

Feel free to [open an issue](https://github.com/jmarqb/Manager-Notification-API/issues) or submit a PR if you find any bugs or have some suggestions for improvements.

© 2023 Jacmel Márquez. All rights reserved.






