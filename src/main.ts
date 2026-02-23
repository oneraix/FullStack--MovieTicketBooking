import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/exception/http-exception.filter';
import { ResponseInterceptor } from './common/interceptor/response.interceptor';
//import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {rawBody: true});
 // app.use('/payments/webhook', bodyParser.raw({ type: 'application/json' })); // thay thế bằng rawBody phía trên.
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const PORT = 3000;
  const logger = new Logger('Bootstrap');
  await app.listen(PORT, () => {
    logger.log(`Server running on port ${PORT}`);
  });
}
bootstrap();

