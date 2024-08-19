import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { MessageObjType } from 'src/message/entities/message.entity';
import { UserObjType } from 'src/users/entities/user.entity';
import { ObjectId } from 'mongodb';
import { Participant } from './participant.entity';
import { ApiProperty } from '@nestjs/swagger';

//Output

@ObjectType()
export class ConversationObjType {
  @Field(()=>ID)
  @ApiProperty()
  _id:ObjectId;

  @Field({nullable:true})
  @ApiProperty()
  type: string;
  
  @Field({nullable:true})
  @ApiProperty()
  status: string;

  @Field({nullable:true})
  @ApiProperty()
  name: string;

  @Field({nullable:true})
  @ApiProperty()
  img: string;

  @Field({nullable:true})
  @ApiProperty()
  theme:string;
}

// Display latest conv in the main conversation bar
@ObjectType()
export class LatestConversation extends ConversationObjType{
  @Field(type => [Participant], {nullable:true})
  @ApiProperty({type:[Participant]})
  participants?: Participant[];

  @Field(type => ID)
  @ApiProperty({type:ID})
  lastMsg: ObjectId
  
  @Field(type => Int, {nullable:true})
  @ApiProperty()
  unread: number;

  @Field(type => [ID], {nullable:true})
  @ApiProperty()
  seenUsers: ObjectId[];
  
  @Field(type => [ID], {nullable:true})
  @ApiProperty()
  someUsers: ObjectId[];
}

// Display group chat as search result
@ObjectType()
export class GroupChat extends ConversationObjType{
  @Field(type => [UserObjType])
  @ApiProperty({type:UserObjType})
  users: UserObjType[];
}

// Use upon open conversation
@ObjectType()
export class DetailConversation extends ConversationObjType{
  @Field(type => [Participant])
  @ApiProperty({type:Participant})
  participants: [Participant];

  @Field(type => [UserObjType], {nullable:true})
  @ApiProperty({type:UserObjType})
  users: UserObjType[];

  @Field(type => [MessageObjType], {nullable:true})
  @ApiProperty()
  messages: MessageObjType[];
}