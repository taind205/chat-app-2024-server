import { ObjectType, Field, ID } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';

@ObjectType()
export class Participant {
    @Field(()=>ID)
    id:ObjectId;

    @Field(()=>ID, {nullable:true})
    seenMsg?:ObjectId;
    
    @Field(()=>Date,{nullable:true})
    seenAt?:Date;

    @Field({nullable:true})
    role:ConversationRole;

    @Field({nullable:true})
    notif:string;
    
    @Field({nullable:true})
    nickname:string;
  }

export type ConversationRole = 'admin'|'member';