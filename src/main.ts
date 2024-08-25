import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

async function bootstrap() {
  const app = await NestFactory.create(AppModule,{
    logger: console,
  });

  // CORS Config
  const corsOptions:CorsOptions = {
    origin: process.env.CLIENT_DOMAIN,
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    credentials:true,
  };
  app.enableCors(corsOptions);

  // Open API
  const config = new DocumentBuilder()
    .setTitle('Chat App API')
    .setDescription('Chat App API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT);
  console.log('Ver1.03');
}
bootstrap();
