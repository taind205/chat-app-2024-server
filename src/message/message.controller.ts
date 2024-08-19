import { Controller, Get, Query, Request } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MessageObjType, MessageObjType_Lite } from './entities/message.entity';
import { ConversationService } from 'src/conversation/conversation.service';

@Controller('message') @ApiTags('Message')
export class MessageController {
    constructor(private readonly conversationService: ConversationService) {};

    @Get('oneMsg')
    @ApiOperation({ summary: 'Get a message from a conversations' })
    @ApiResponse({ status: 200, description: 'OK', type: MessageObjType_Lite })
    getOneMsg(@Request() req, @Query('mid') msgId: string, @Query('cid') convId: string) { 
        const userId = req['user'].userId;
        return this.conversationService.getOneMsg({userId,msgId,convId})
    }

    @Get('by-conv-and-pos')
    @ApiOperation({ summary: 'Get messages by specific conversation Id and message Id as cursor' })
    @ApiResponse({ status: 200, description: 'OK', type: [MessageObjType] })
    @ApiQuery({name:'mid', required:false})
    getMessages(@Request() req, @Query('cid') convId: string, @Query('mid') cursorMsgId?:string) {
        const userId = req['user'].userId;
        return this.conversationService.getMessages({convId,userId,pos:cursorMsgId,});
    }

    @Get('media-by-conv-and-pos')
    @ApiOperation({ summary: 'Get messages with media by specific conversation Id and message Id as cursor' })
    @ApiResponse({ status: 200, description: 'OK', type: [MessageObjType] })
    @ApiQuery({name:'mid', required:false})
    getMediaMessages(@Request() req, @Query('cid') convId: string, @Query('mid') cursorMsgId?:string) {
        const userId = req['user'].userId;
        return this.conversationService.getMediaMessages({convId,userId,pos:cursorMsgId});
    }
}
