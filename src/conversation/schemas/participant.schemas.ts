import { Prop, Schema } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { Schema as mongooseSchema } from 'mongoose';
import { ConversationRole } from '../entities/participant.entity';

@Schema({_id:false})
export class Participant {
  @Prop({type: mongooseSchema.Types.ObjectId, required:true})
  id: ObjectId;

  @Prop({type: mongooseSchema.Types.ObjectId})
  seenMsg?: ObjectId;

  @Prop({default:undefined})
  seenAt?:Date;

  @Prop({default:undefined})
  role:ConversationRole;

  @Prop({default:undefined})
  notif:string;
  
  @Prop({default:undefined})
  nickname:string;
}