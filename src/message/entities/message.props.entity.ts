import { ObjectType, Field, Int, ID } from '@nestjs/graphql';
import { ApiProperty } from '@nestjs/swagger';
import { ObjectId } from 'mongodb';

@ObjectType()
export class Action {
  @ApiProperty({type:()=>ID,nullable:false})
  by:ObjectId;
  
  @ApiProperty({type:()=>ID,nullable:true})
  target?:ObjectId;

  @ApiProperty({nullable:true})
  value?:string;
}

@ObjectType()
export class UserReact {
  @Field(()=>ID)
  @ApiProperty()
  user:ObjectId;
  
  @Field()
  @ApiProperty()
  react:string;
}