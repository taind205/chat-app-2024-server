import { Module } from '@nestjs/common';
import { ChatGateway } from './socket.gateway';
import { MessageService } from 'src/message/message.service';
import { UsersService } from 'src/users/users.service';
import { ConversationService } from 'src/conversation/conversation.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Conversation, ConversationSchema } from 'src/conversation/schemas/conversation.schemas';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Message, MessageSchema } from 'src/message/schemas/message.schemas';
import { FirebaseService } from '../firebase/firebase.service';
import { JwtModule } from '@nestjs/jwt';
import { jwtOptions } from 'src/auth/constants';

@Module({
  imports: [MongooseModule.forFeature([{ name: Conversation.name, schema: ConversationSchema },
    { name: User.name, schema: UserSchema },{ name: Message.name, schema: MessageSchema }]),
    JwtModule.register(jwtOptions),],
  providers: [ChatGateway,ConversationService, UsersService,MessageService,FirebaseService,
  ],
})
export class SocketModule {}