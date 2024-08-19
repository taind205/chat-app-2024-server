import { Controller, Get, Optional, Query, Request } from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetLatestConv_Response, GetConv_Response, ConversationLoadPos } from './dto/conversation-and-user.output';

@Controller('conversation') @ApiTags('Conversation')
export class ConversationController {
    
    constructor(private readonly conversationService: ConversationService) {};

    @Get('latest')
    @ApiOperation({ summary: 'Get latest conversations by user Id and last message Id as cursor' })
    @ApiResponse({ status: 200, description: 'OK', type: GetLatestConv_Response })
    @ApiQuery({name:'pos',required:false, type:()=>ConversationLoadPos})
  getLatestConvs(@Request() req, @Query('pos') inputPos?: string, ) {
    const userId = req['user'].userId;
    const inputSplit = inputPos?.split(',',2);
    const pos:ConversationLoadPos = [inputSplit?.[0],inputSplit?.[1]];
    return this.conversationService.getLatestConvs({userId,pos});
  }

  @Get('get')
    @ApiOperation({ summary: 'Get conversations by id or two user id' })
    @ApiResponse({ status: 200, description: 'OK', type: GetConv_Response })
    @ApiQuery({name:'id',type:[String]})
  findOne(@Request() req, @Query('id') id:string) {
    const userId = req['user'].userId;
    let userIdsOrConvId:string|string[] = id.split(',');
    if(userIdsOrConvId.length==1) userIdsOrConvId=userIdsOrConvId[0];
    return this.conversationService.getOne({userId,address:userIdsOrConvId});
  }
}
