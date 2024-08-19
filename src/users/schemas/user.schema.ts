// import { ObjectType, Field, Int } from '@nestjs/graphql';
// import { Entity, Column, PrimaryGeneratedColumn, PrimaryColumn } from 'typeorm';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ObjectId } from 'mongodb';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  @Prop({auto:true})
  _id: ObjectId;

  @Prop({required: false})
  auth0Id: string;

  @Prop()
  email?:string;

  @Prop()
  username?: string;

  @Prop({required: true})
  displayName: string;
  
  @Prop()
  prfImg?: string;

  @Prop({ default: undefined, required:false})
  role: string;

  @Prop({ default: undefined, required:false })
  lastAct: Date;

  @Prop({ default: undefined, required:false })
  status: string;

  @Prop({type:[String],default: undefined, required:false})
  offConv:string[];
}


export const UserSchema = SchemaFactory.createForClass(User);