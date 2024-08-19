import { InputType, Int, Field } from '@nestjs/graphql';
import { SendMessageInput } from 'src/message/dto/send-message.input';

@InputType()
export class CreateGroupConversationInput {
  @Field(type => [String])
  users: string[];

  @Field({nullable: true})
  name: string;
}

export interface GetOrCreateConversationInput {
  userIds:string[];
  message?:SendMessageInput;
}