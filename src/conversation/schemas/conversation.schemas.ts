import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as mongooseSchema, HydratedDocument } from 'mongoose';
import { Message } from 'src/message/schemas/message.schemas';
import { Participant } from './participant.schemas';
import { ObjectId } from 'mongodb';

export type ConversationDocument = HydratedDocument<Conversation>;

@Schema()
export class Conversation {
  _id: ObjectId;
  
  @Prop({required:false, type: [Participant]})
  participants: Participant[];

  @Prop({type:mongooseSchema.Types.ObjectId, ref: 'Message'})
  lastMsg: ObjectId;
  
  @Prop({default:undefined, required:false})
  type: string;

  @Prop({default:undefined, required:false})
  status: string;
  
  @Prop({default:undefined, required:false, type:String})
  lastMsgData: Message;

  @Prop()
  name: string;
  
  @Prop()
  img: string;

  @Prop()
  theme:string;

  @Prop({default:undefined, type: Number})
  unread: number;

  @Prop({default:undefined, type: [Message]})
  messages: Message[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);