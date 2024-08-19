import { ApiProperty } from '@nestjs/swagger';
import { CreateUserInput } from './create-user.input';
import { InputType, Field, Int, PartialType } from '@nestjs/graphql';

@InputType()
export class UpdateUserInput {

  @Field()
  @ApiProperty({nullable:true})
  username: string;

  @Field()
  @ApiProperty({nullable:true})
  displayName: string;
  
  @Field()
  @ApiProperty({nullable:true})
  prfImg: string;
}
