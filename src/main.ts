import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/exception/http-exception.filter';
import { ResponseInterceptor } from './common/interceptor/response.interceptor';
import { ConfigType } from '@nestjs/config';
import appConfig from './config/app.config';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
//import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {rawBody: true});
 // app.use('/payments/webhook', bodyParser.raw({ type: 'application/json' })); // thay thế bằng rawBody phía trên.
const appCfg = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);
const port = appCfg.port;

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));
  app.use(helmet());

  app.enableCors({
    origin: appCfg.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization']
  });

if (process.env.NODE_ENV !== 'production') {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Movie Ticket Booking API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);
}

  // const PORT = 3000;
  const logger = new Logger('Bootstrap');
app.enableShutdownHooks();  
  await app.listen(port, () => {
    logger.log(`Server running on port ${port}`);
  });
}
bootstrap();

