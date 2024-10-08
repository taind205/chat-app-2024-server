import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { SocketModule } from './socket/socket.module';
import { ConfigModule } from '@nestjs/config';
import { MessageModule } from './message/message.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConversationModule } from './conversation/conversation.module';
import { AuthModule } from './auth/auth.module';
import { AuthService } from './auth/auth.service';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerModule } from '@nestjs/throttler';


@Module({
  imports: [UsersModule, MessageModule, ConversationModule, 
    SocketModule, ConfigModule.forRoot(), 
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '3600s' },
      global:true,
    }),
    MongooseModule.forRoot(process.env.DB_URI,{dbName:process.env.DB_NAME}),
    AuthModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    ],
  controllers: [AppController],
  providers: [AppService, AuthService],
})
export class AppModule {}
