import { Body, Controller, Get, Post, Query, Request } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiProperty, ApiTags, ApiBody } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UserObjType } from './entities/user.entity';
import { UpdateUserInput } from './dto/update-user.input';
import { SearchResponse, UserSearchResponse } from './dto/search.output';
import { Public } from 'src/auth/decorator';

@Controller('users') @ApiTags('Users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {};

  @Get('by-ids')
  @ApiOperation({ summary: 'Get users by specific IDs' })
  @ApiResponse({ status: 200, description: 'OK', type: [UserObjType] })
  findSome(@Query('ids') ids: string[]) {
    return this.usersService.findSome(ids);
  }

  @Post('update')
  @ApiOperation({ summary: "Update user's username, display name or profile image by specific id" })
  @ApiResponse({ status: 200, description: 'OK', type: String })
  @ApiBody({ type: UpdateUserInput })
  updateUser(@Body() updateUserInput: UpdateUserInput, @Request() req ) {
    const userId = req['user'].userId;
    return this.usersService.update({userId,updateInput:updateUserInput});
  }
  
  @Get('search')
    @ApiOperation({ summary: 'Search for conversations or user by term' })
    @ApiResponse({ status: 200, description: 'OK', type: UserSearchResponse||SearchResponse })
  search(@Query('term') term:string, @Query('type') type:'user'|'conv',@Request() req) {
    const userId = req['user'].userId;
    return this.usersService.search({searchTerm:term,searchType:type,userId:userId});
  }

  @Public()
  @Get('get-sample-user')
    @ApiOperation({ summary: 'Get sample user' })
    @ApiResponse({ status: 200, description: 'OK', type: UserSearchResponse })
    async getSampleUser() {
    return {users: await this.usersService.getSampleUser()};
  }

  @Get('get-signed-in-user')
    @ApiOperation({ summary: 'Get signed in user' })
    @ApiResponse({ status: 200, description: 'OK', type: UserObjType })
    async getSignedInUser(@Request() req) {
    return await this.usersService.findOne(req['user'].userId);
  }

}
