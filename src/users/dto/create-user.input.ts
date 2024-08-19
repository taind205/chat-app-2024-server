import { InputType, Int, Field } from '@nestjs/graphql';

@InputType()
export class CreateUserInput {
  @Field()
  auth0Id: string;

  @Field()
  fullName: string;
  
  @Field()
  profileImg: string;
}
