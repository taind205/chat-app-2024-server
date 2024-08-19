import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { ObjectId } from 'mongodb';
import { ApiProperty } from '@nestjs/swagger';

@ObjectType()
export class UserObjType {
  @Field(()=>ID)
  @ApiProperty()
  _id:ObjectId;

  @Field({nullable:true})
  @ApiProperty()
  auth0Id?: string;

  @Field()
  @ApiProperty({nullable:true})
  username?: string;

  @Field()
  @ApiProperty()
  displayName: string;

  @Field({nullable:true})
  @ApiProperty()
  email?: string;
  
  @ApiProperty({nullable:true})
  @Field({nullable:true})
  prfImg?: string;

  @Field({nullable:true})
  role?: string;

  @Field({nullable:true})
  @ApiProperty()
  lastAct?: Date;

  @Field({nullable:true})
  status?: string

  @Field(()=>[String],{nullable:true})
  offConv?: string[];
}
