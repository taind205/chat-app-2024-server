import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class SendMessageInput {

  @Field()
  user: string;

  conv: string;

  media:string[];

  @Field()
  cont: string;

  @Field({nullable: true})
  repMsg?: string;

  imgFiles?: Array<string>;

  @Field(type => Int, {nullable: true})
  sticker?: number;

  @Field(type => [Input_RelatedUser], {nullable: true})
  relatedUser?: Input_RelatedUser[];

  @Field(type => [String], {nullable:true})
  file?: string[];
  
}


@InputType()
export class MessageAddress {
  @Field()
  id:string;

  @Field(type => Boolean)
  isConv:boolean;
}

@InputType()
export class Input_RelatedUser {
    @Field()
    user:string;

    @Field(type => Int)
    pos:number
  }

  
@InputType()
export class ConvUserUpdate{
  @Field()
  id:string;

  @Field(type => Int)
  role:number; //role = 0 -> Remove user from group chat.

  @Field()
  nickname:string;
}