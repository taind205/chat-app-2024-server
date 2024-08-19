import { Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Message, MessageSchema } from './schemas/message.schemas';
import { ConversationService } from 'src/conversation/conversation.service';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Conversation, ConversationSchema } from 'src/conversation/schemas/conversation.schemas';
import { MessageController } from './message.controller';
import { UsersModule } from 'src/users/users.module';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Message.name, schema: MessageSchema }, 
      {name:Conversation.name, schema:ConversationSchema},{name:User.name, schema:UserSchema}]),
    UsersModule],
  providers: [ MessageService, ConversationService, FirebaseService],
  controllers: [MessageController],
})
export class MessageModule {}
