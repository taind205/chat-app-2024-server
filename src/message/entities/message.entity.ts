import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { Schema } from 'mongoose';
import { LatestConversation } from 'src/conversation/entities/conversation.entity';
import { UserObjType } from 'src/users/entities/user.entity';
import { Action, UserReact } from './message.props.entity';
import { ObjectId } from 'mongodb';
import { ApiProperty } from '@nestjs/swagger';
import { ConversationRole } from 'src/conversation/entities/participant.entity';

export enum MessageStatus {
  Unsent = 'unsent',
  Normal = 'normal',
}

@ObjectType()
export class RepMessage {
  @Field(()=>ID)
  @ApiProperty()
  _id: ObjectId;
  
  @Field()
  @ApiProperty()
  cont: string;
  
  @Field(()=>ID)
  @ApiProperty()
  user: ObjectId;

  @Field({nullable:true})
  @ApiProperty()
  status?: string;
  
  @Field({nullable:true})
  @ApiProperty()
  type?: string;

  @Field(type => [String], {nullable: true})
  @ApiProperty()
  media?: string[];
  
  @Field(type => [RelatedUser], {nullable: true})
  @ApiProperty()
  relUser?: RelatedUser[];

  @Field(type => [String], {nullable:true})
  @ApiProperty()
  file?: string[];
}

interface Message {
  _id: ObjectId;
  cont?: string;
  user: ObjectId;
  status?: MessageStatus;
  type?: string;
  media?: string[];
  relUser?: RelatedUser[];
  file?: string[];
  edit?: Edit[];
  react?: UserReact[];
  userHide?: string[];
  repMsg?: RepMessage;
  sticker?: number;
  seenUser?: string[];
  act?:Action;
}

@ObjectType()
export class BaseMessageObjType implements Message{
  @Field(()=>ID)
  @ApiProperty()
  _id: ObjectId;
  
  @Field()
  @ApiProperty()
  cont: string;
  
  @Field(()=>ID)
  @ApiProperty()
  user: ObjectId;
  
  @Field({nullable:true})
  conv?: string;

  @Field({nullable:true})
  @ApiProperty({enum:()=>MessageStatus, nullable:true})
  status?: MessageStatus;
  
  @Field({nullable:true})
  @ApiProperty()
  type?: string;

  @Field(type => [String], {nullable: true})
  @ApiProperty()
  media?: string[];
  
  @Field(type => [RelatedUser], {nullable: true})
  @ApiProperty()
  relUser?: RelatedUser[];

  @Field(type => [String], {nullable:true})
  @ApiProperty()
  file?: string[];

  @Field(type => [Edit], {nullable: true})
  @ApiProperty()
  edit?: Edit[];
  
  @Field(type => [UserReact], {nullable: true})
  @ApiProperty({type:UserReact})
  react?: UserReact[];

  @Field(type => [String], {nullable:true})
  userHide?: string[];

  @Field(type => Int, {nullable: true})
  @ApiProperty()
  sticker?: number;

  @Field(type => [String], {nullable:true})
  @ApiProperty()
  seenUser?: string[];
}

@ObjectType()
export class MessageObjType extends BaseMessageObjType{
  @Field(type => RepMessage, {nullable: true})
  @ApiProperty({type:RepMessage})
  repMsg?: RepMessage;
}

export class MessageObjType_Lite extends BaseMessageObjType{
  repMsg?: ObjectId ;
}

@ObjectType()
export class MessageSumary implements Pick<Message,"_id"|"cont"|"user"|"status"|"type"|"act">{
  @ApiProperty()
  @Field(()=>ID)
  _id: ObjectId;
  
  @Field({nullable:true})
  @ApiProperty({nullable:true})
  cont: string;

  @Field(()=>ID,{nullable:true})
  @ApiProperty({nullable:true})
  user: ObjectId;

  @Field({nullable:true})
  @ApiProperty({nullable:true})
  userNickname?: string;
  
  @Field({nullable:true})
  @ApiProperty({enum:()=>MessageStatus,nullable:true})
  status?: MessageStatus;
  
  @Field({nullable:true})
  @ApiProperty({type:()=>String,nullable:true})
  type?: MessageType;

  @Field({nullable:true})
  @ApiProperty({type:()=>Action,nullable:true})
  act?: Action;
}



@ObjectType()
export class RelatedUser {
    @Field()
    @ApiProperty()
    user:string;

    @Field(type => Int)
    @ApiProperty()
    pos:number
  }

@ObjectType()
export class Edit {
  @Field()
  @ApiProperty()
  cont:string;

  @Field(type => Date)
  @ApiProperty()
  time:Date;
}

export type ActionMessage = {_id:string, conv:string} & (
  {type:'createChat',act:{by:string,target?:undefined,value?:undefined}}|
  {type:'setRole',act:{by:string,target:string,value:ConversationRole}}|
  {type:'setNickname',act:{by:string,target:string,value:string}}|
  {type:'leave',act:{by:string,target?:undefined,value?:undefined}}|
  {type:'addMember',act:{by:string,target:string,value?:undefined}}|
  {type:'removeMember',act:{by:string,target:string,value?:undefined}}|
  {type:'changeGroupPhoto',act:{by:string,target?:undefined,value?:string}}|
  {type:'changeGroupName',act:{by:string,target?:undefined,value:string}}
)

export type MessageType = 'setRole'|'setNickname'|'leave'|'addMember'|'removeMember'|'changeGroupPhoto'|'changeGroupName'|'createChat'

export type MongoDB_ActionMessage = {_id:ObjectId, conv:ObjectId} & {type:MessageType,act:{by:ObjectId,target?:ObjectId,value?:string}}
