// conversation.dto.ts
import { Field, ObjectType } from '@nestjs/graphql';
import { DetailConversation, LatestConversation } from '../entities/conversation.entity';
import { UserObjType } from 'src/users/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';
import { MessageSumary } from 'src/message/entities/message.entity';

@ObjectType()
export class GetLatestConv_Response {
  @Field(() => [LatestConversation])
  @ApiProperty({type:[LatestConversation]})
  convs: LatestConversation[];

  @Field(() => [UserObjType])
  @ApiProperty({type:UserObjType})
  users: UserObjType[];
  
  @Field(() => [MessageSumary])
  @ApiProperty({type:MessageSumary})
  latestMsgs: MessageSumary[];

  @Field(() => ConversationLoadPos)
  @ApiProperty({type:()=>ConversationLoadPos})
  pos: ConversationLoadPos;
}

export type ConversationLoadPos = [string|undefined,string|undefined]|undefined;
export const ConversationLoadPos = [String||undefined,String||undefined]||undefined;

@ObjectType()
export class GetConv_Response {
  @Field(() => DetailConversation, {nullable:true})
  @ApiProperty({type:DetailConversation})
  conv?: DetailConversation;

  @Field(() => [UserObjType],{nullable:true})
  @ApiProperty({type:UserObjType})
  users?: UserObjType[];

  @Field({nullable:true})
  @ApiProperty()
  msgCode?:string
}