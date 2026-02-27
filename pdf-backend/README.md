# PDF Nexus Backend

A comprehensive PDF processing backend with e-signature capabilities built with NestJS.

## Features

- PDF compression with Ghostscript fallback
- E-signature functionality with document management
- File upload and processing
- PostgreSQL database integration

## Prerequisites

- Node.js (v16 or higher)
- PostgreSQL database
- npm or yarn

## Database Setup

This application uses PostgreSQL for data persistence. See [POSTGRESQL_SETUP.md](./POSTGRESQL_SETUP.md) for detailed setup instructions.

### Quick Setup

1. Install PostgreSQL and create a database
2. Copy `.env.example` to `.env` and update database credentials
3. Run migrations (automatic with `synchronize: true`)

## Installation

```bash
npm install
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_NAME=pdf_nexus

# Application
PORT=3000
```

## Running the Application

```bash
# development
npm run start:dev

# production
npm run start:prod
```

## API Endpoints

### E-Signature
- `POST /e-signature/signatures` - Create signature
- `GET /e-signature/signatures` - Get user signatures
- `POST /e-signature/send` - Send document for signature
- `GET /e-signature/documents` - Get user documents
- `POST /e-signature/sign/:documentId` - Sign document

### PDF Processing
- `POST /pdf-compression` - Compress PDF
- `POST /image-to-pdf` - Convert images to PDF
- And more...

## Project Structure

```
src/
├── modules/
│   ├── e-signature/
│   │   ├── entities/          # TypeORM entities
│   │   ├── dto/              # Data transfer objects
│   │   ├── controller/       # HTTP controllers
│   │   └── service/          # Business logic
│   └── [other modules]/
├── config/                   # Database configuration
└── uploads/                  # File storage
```

## Technologies Used

- **NestJS** - Node.js framework
- **TypeORM** - Database ORM
- **PostgreSQL** - Database
- **pdf-lib** - PDF manipulation
- **Multer** - File uploads
- **class-validator** - Input validation

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
