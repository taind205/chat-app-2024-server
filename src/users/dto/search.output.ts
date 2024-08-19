// conversation.dto.ts
import { Field, ObjectType } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { UserObjType } from 'src/users/entities/user.entity';
import { GroupChat } from 'src/conversation/entities/conversation.entity';

@ObjectType()
export class UserSearchResponse {
  @Field(() => [UserObjType],{nullable:true})
  @ApiProperty({type:[UserObjType]})
  users: UserObjType[];
}

@ObjectType()
export class SearchResponse {
  @Field(() => [GroupChat],{nullable:true})
  @ApiProperty({type:[GroupChat]})
  groups: GroupChat[];

  @Field(() => [UserObjType],{nullable:true})
  @ApiProperty({type:[UserObjType]})
  users: UserObjType[];
}