import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Schema as mongooseSchema, HydratedDocument } from 'mongoose';
import { Action, Edit, RelatedUser, UserReact } from './props.schemas';
import { ObjectId } from 'mongodb';
import { MessageStatus, MessageType } from '../entities/message.entity';

export type MessageDocument = HydratedDocument<Message>;

@Schema()
export class Message {
  @Prop({type: mongooseSchema.Types.ObjectId,auto:true})
  _id: ObjectId;
  
  @Prop({required:false})
  cont?: string;

  @Prop({type:()=>MessageStatus, default:undefined})
  status?: MessageStatus;

  @Prop({default:undefined})
  type?: MessageType;

  @Prop({required:false, type: mongooseSchema.Types.ObjectId, ref: 'User'})
  user?: ObjectId;

  @Prop({required:true, type: mongooseSchema.Types.ObjectId, ref: 'Conversation'})
  conv: ObjectId;

  @Prop({type: mongooseSchema.Types.ObjectId, ref: 'Message'})
  repMsg?: ObjectId;

  @Prop({type:[String], default: undefined})
  media?: string[];
  
  @Prop()
  sticker?: number;

  @Prop({type:[UserReact], default: undefined})
  react?: UserReact[];
  
  @Prop({type:[Edit], default: undefined})
  edit?: Edit[];

  @Prop({type:[RelatedUser], default: undefined})
  relUser?: RelatedUser[];
  
  @Prop({type: [mongooseSchema.Types.ObjectId], default: undefined})
  userHide?: ObjectId[];

  @Prop({type:[String], default: undefined})
  file?: string[];

  @Prop({type:Action, default:undefined})
  act?:Action 

}

export const MessageSchema = SchemaFactory.createForClass(Message);
