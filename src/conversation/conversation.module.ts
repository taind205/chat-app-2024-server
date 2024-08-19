import { Module } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Conversation, ConversationSchema } from './schemas/conversation.schemas';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { ConversationController } from './conversation.controller';
import { UsersModule } from 'src/users/users.module';
import { FirebaseService } from 'src/firebase/firebase.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Conversation.name, schema: ConversationSchema },
    { name: User.name, schema: UserSchema },
  ]),
  UsersModule],
  providers: [ ConversationService, FirebaseService
  ],
  controllers: [ConversationController],
})
export class ConversationModule {}
