import { Injectable } from '@nestjs/common';
import { SendMessageInput } from './dto/send-message.input';
import { UpdateMessageInput } from './dto/update-message.input';
import { Types } from 'mongoose';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ConversationService } from 'src/conversation/conversation.service';
import { Message } from './schemas/message.schemas';
import { ActionMessage, MessageObjType, MongoDB_ActionMessage } from './entities/message.entity';
import { ObjectId } from 'mongodb';

@Injectable()
export class MessageService {
  constructor(
    // @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private conversationService: ConversationService,
  ) {}

  async sendMessage({msg,targetUserId}:{msg:SendMessageInput,targetUserId:string}){
    const ObjectId = Types.ObjectId;
    let input = msg;
    if(input.conv=='temp'){
      if(targetUserId){
        const conv = await this.conversationService.getOrCreate({userIds:[input.user,targetUserId], message:input})
        if(conv?.id) input.conv=conv.id;
        else throw new Error('error get or create conv');
      } else throw new Error(`invalid input, targetUId = ${targetUserId}`)
    }
    const newMsg = {...input,user:new ObjectId(input.user),conv:new ObjectId(input.conv),repMsg: input.repMsg?new ObjectId(input.repMsg):undefined}

    const msgInsertRes = await this.messageModel.insertMany(newMsg);
    const insertedMsg = msgInsertRes[0];
    const updateConvRes = await this.conversationService.updateNewMsg(
      {convId:input.conv,newMsgId:insertedMsg.id,actUser:insertedMsg.user.toString()})
    return {newMessage:insertedMsg, conversation:updateConvRes};
  }

  async addActionMessage({actionMsg}:{actionMsg:Omit<ActionMessage,"_id">}){
    const {conv,act,type} = actionMsg
    let inputMsg:Partial<MongoDB_ActionMessage> =
     {conv:new Types.ObjectId(conv), type, act:{by:new Types.ObjectId(act.by),
      ...act.target?{target:new Types.ObjectId(act.target)}:{},...act.value?{value:act.value}:{} } };
    
    const insertRes = await this.messageModel.create(inputMsg);
    const insertedMsg = insertRes;

    const updateConvRes = await this.conversationService.updateNewMsg(
      {convId:conv,newMsgId:insertedMsg.id,actUser:insertRes.act.by.toString()})
    return insertedMsg as MongoDB_ActionMessage;
  }

  async update(input: UpdateMessageInput):Promise<boolean> {
    if(input.type=='react') {
      const {user,react,msgId} = input.data;
      const res = await this.messageModel.updateOne(
        {_id: new Types.ObjectId(msgId)},
        {
          $pull: {
            react:{user:new Types.ObjectId(user)}
          },
        })
      const res2 = await this.messageModel.updateOne(
        {_id: new Types.ObjectId(msgId)},
        {
          $push: {
              react:{react,user:new Types.ObjectId(user)}
            }
        })
      return res2.acknowledged;
    }
    else if(input.type=='unsend') {
      const {convId,userId,msgId} = input.data;
      const res = await this.messageModel.replaceOne(
        {_id: new Types.ObjectId(msgId),conv:new Types.ObjectId(convId), user:new Types.ObjectId(userId)},
        {_id: new Types.ObjectId(msgId),conv:new Types.ObjectId(convId), user:new Types.ObjectId(userId),cont:"",status:'unsent'},
        )
      return res.modifiedCount==1;
    }
    else if(input.type=='hide') {
      const {convId,userId,msgId} = input.data;
      const res = await this.messageModel.updateOne(
        {_id: new Types.ObjectId(msgId),conv:new Types.ObjectId(convId)},
        {
          $addToSet:{
            userHide:new ObjectId(userId)
          }
        })
      return res.acknowledged;
    }
    else return false;
  }
}
