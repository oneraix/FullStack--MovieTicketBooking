import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = process.env.PORT ?? 3000;
  const logger = new Logger('Bootstrap');
  await app.listen(PORT, () => {
    logger.log(`Server running on port ${PORT}`);
  });
}
bootstrap();
