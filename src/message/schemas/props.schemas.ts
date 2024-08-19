import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { Schema as mongooseSchema, HydratedDocument } from 'mongoose';


@Schema({_id:false})
export class Action {
  @Prop({type: mongooseSchema.Types.ObjectId, required:true})
  by:ObjectId;
  
  @Prop({default:undefined, type: mongooseSchema.Types.ObjectId})
  target?:ObjectId;
  
  @Prop({default:undefined})
  value?:string;
}


@Schema({_id:false})
export class UserReact {
  @Prop({type: mongooseSchema.Types.ObjectId, required:true})
  user:ObjectId;
  
  @Prop({default:undefined, required:true})
  react:string;
}


@Schema()
export class RelatedUser {
  @Prop({type: mongooseSchema.Types.ObjectId, ref: 'User'})
  user:ObjectId;

  @Prop()
  pos:number
  }

@Schema()
export class Edit {
  @Prop()
  cont:string;

  @Prop({type:Date})
  time:Date;
}