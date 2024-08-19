import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateGroupConversationInput, GetOrCreateConversationInput } from './dto/create-group-conversation.input';
import { Schema, Types } from 'mongoose';
import { ConversationObjType, DetailConversation, LatestConversation } from './entities/conversation.entity';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { UsersService } from 'src/users/users.service';
import { GetLatestConv_Response, GetConv_Response, ConversationLoadPos } from './dto/conversation-and-user.output';
import { MessageSumary, MessageObjType, MessageObjType_Lite } from '../message/entities/message.entity';
import { getConvWithLastMsg_AggPl_v4, getGroupChatIds, getLatestConvs_v3_Pipeline,
   getLatestConvs_Absolutely_Pipeline, 
   getOneMsg_Auth,
   getMoreMsg_Auth_AggPl_v4,
   getMediaMsg_Auth_AggPl,
   updateConv_AdminAuth_Pipeline,
   getConvAdminRole_Pipeline,
   getAdminRole_CheckTargetExist} from './conversation.aggPipeline';
import { Conversation } from './schemas/conversation.schemas';
import { ObjectId } from 'mongodb';
import { ConversationRole, Participant } from './entities/participant.entity';
import { UpdateConversationInput, UpdateParticipantInput } from 'src/socket/socket.type';
import { FirebaseService } from 'src/firebase/firebase.service';

@Injectable()
export class ConversationService {
  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<Conversation>,
    private usersService: UsersService,
    private readonly firebaseService: FirebaseService,
  ) {}
  
  async getOneMsg({userId,convId, msgId}: {userId:string,convId:string, msgId:string}):Promise<MessageObjType_Lite> {
    const r = await this.conversationModel.aggregate(getOneMsg_Auth({userId,convId,msgId}));
    return r[0];
  }
  
  async getMessages(input:{convId: string, userId:string, pos?:string}) {
    const {convId,userId,pos} = input;
    const r:MessageObjType[] = await this.conversationModel.aggregate(getMoreMsg_Auth_AggPl_v4({convId,userId,msgIdPos:pos}));
    return r[0];
  }

  async getMediaMessages(input:{convId: string, userId:string, pos?:string}) { 
    const {convId,userId,pos} = input;
    const r = await this.conversationModel.aggregate(getMediaMsg_Auth_AggPl({convId,userId,msgIdPos:pos}));
    return r[0];
  }

  async getLatestConvs({userId,pos}:{userId:string, pos?:ConversationLoadPos}):Promise<GetLatestConv_Response>{
    const fetchConvRes = await this.fetchLatestConvs({userId,pos});
    const {userIds, transformConvData,latestMessageSumary} = this.transformLatestConv(fetchConvRes.data);
    const userData = await this.usersService.findSome(userIds);
    return {users:userData,convs:transformConvData,latestMsgs:latestMessageSumary,pos:fetchConvRes.pos};
  }

  private async fetchLatestConvs({userId, pos}:{userId:string, pos?:[string,string]}
  ):Promise<{data:Conversation[],pos:ConversationLoadPos}>{
    const convLMP:string|undefined=pos?.[0]
    const absLMP:string|undefined=pos?.[1];
    const fetchConv = async ({type,num,convLMP,absLMP}:{type?:'abs'|'nor',num?:number,convLMP?:string|undefined,absLMP?:string|undefined}) => {
      let res:Conversation[] = [];
      if(type=='nor')
        res = await this.conversationModel.aggregate(getLatestConvs_v3_Pipeline({userId,lastMsgPos:convLMP,num}));
      else res = await this.conversationModel.aggregate(getLatestConvs_Absolutely_Pipeline({userId,convLMP,absLMP}));

      // Filter all conv that don't have real last msg (bc of all msg being hidden)
      return res.filter(v=>v.lastMsgData);
    }
    
    let loadedConv:Conversation[] = await fetchConv({type:'nor',convLMP});

    if(loadedConv.length==0) return {data:[],pos:[convLMP,absLMP]};
    // Check if all messages is already fetched (by Abs fetch) and fetch another batch of messages
    if(absLMP) {
      //Find if there's at least one new message that's not already fetched
      function checkFetch() {return loadedConv.findIndex(v=>v.lastMsgData._id.toString()<absLMP)}
      let checkFetchRes = checkFetch(); 
      while(checkFetchRes==-1) { //All message is already fetched
        const newConvLMP = loadedConv.at(-1).lastMsg.toString();
        // Fetch 20 new conv
        loadedConv = await fetchConv({type:'nor',num:20,convLMP: newConvLMP});
        console.log('fetch more: ',loadedConv.length);
        if(loadedConv.length==0) return {data:[],pos:[newConvLMP,absLMP]};
        checkFetchRes = checkFetch();
      }
    }

    // Message is hide from user, if the last message is hide, the order of latest conversation (marked with last msg) may not be correct.
    // These code check if the conversation loaded is enough or not...
    // and make some sort, filter to ensure the latest conversation order is correct and enough.
    let outputAbsLMP:string;
    let outputConvLMP:string;

    // Check if there's incorrect last message position (real last msg is older than idx last msg )
    const oldestLastMsgIdx = loadedConv.at(-1).lastMsg.getTimestamp();
    const checkLMP = loadedConv.findIndex(v=>v.lastMsgData && v.lastMsgData._id.getTimestamp()<oldestLastMsgIdx);
    
    if(checkLMP==-1) { // all conv have the correct last msg index
      console.log('fetch normal ',loadedConv.length)
      outputConvLMP = loadedConv.at(-1).lastMsg.toString();
      outputAbsLMP = outputConvLMP;
      return {data:loadedConv,pos:[outputConvLMP,outputAbsLMP]};
    } else if(Number.isInteger(checkLMP)) {
      const absConv:Conversation[] = await fetchConv({type:'abs',convLMP,absLMP});
      console.log('fetch abs ',absConv.length);
      if(absConv.length==0) return {data:[],pos:[convLMP,absLMP]};

      outputAbsLMP = absConv.at(-1).lastMsgData._id.toString();
      //find idx of the first element haven't load at this time yet to load (and check) at next time.
      const convPos = loadedConv.findIndex(v=>v.lastMsgData._id.toString()<outputAbsLMP);
      if(convPos==-1) { //All initConv have inculded in the abs fetch;
        outputConvLMP =loadedConv.at(-1).lastMsg.toString();
      } else if(Number.isInteger(convPos)){ // There's an initConv have the real pos older than the oldest in abs fetch, we mark the pos and fetch it the next time...
        outputConvLMP = loadedConv[convPos-1]?.lastMsg.toString() || convLMP;
      } else throw new Error(`unhandle case met convPos=${convPos}`);
      return {data:absConv, pos:[outputConvLMP,outputAbsLMP]};
    } else throw new Error(`unhandle case met, checkLMP=${checkLMP}`);

  }

  async getOne({userId,address}:{userId:string,address: string|string[]}):Promise<GetConv_Response> {
    if(!address[0]) return {msgCode:"input-err"};
    console.log(address);
    
    const convData:DetailConversation[] = await this.conversationModel.aggregate(getConvWithLastMsg_AggPl_v4({userId,address}));
    if(!convData[0]) return {msgCode:"new"};
    // Detect user seen need improved by other way.
    // this.updateParticipant({userId,updateInput:{convId:convData[0]._id.toString(),seenMsg:convData[0].messages[0]._id.toString()}})

    return {conv:{...convData[0]}};
  }

  async getOrCreate(input:GetOrCreateConversationInput):Promise<{id:string}>{
    const {userIds,message} = input;
    const userOIds = userIds.map(v=>new Types.ObjectId(v));
    if(userIds.length==2 && message) {
      const conv = await this.conversationModel.findOne( //check if exist and get it or create new
        {"participants.id":{$all:[userOIds[0],userOIds[1]] }, type:undefined })
        console.log('get conv for 2 user:',conv)
        if(!conv?.id) {
          const newConv = await this.conversationModel.create( 
            { "participants":[{id:userOIds[0]},{id:userOIds[1]}] })
            console.log('create conv for 2 user:',newConv);
            return {id:newConv._id.toString()};
        } else {
        return({id:conv.id})
        }
      }
    else throw new Error(`invalid length`);
  }

  async createGroupChat({userIds}:{userIds:string[]}):Promise<Conversation>{
    const userIdsSet = new Set(userIds);
    const userOIds = Array.from(userIdsSet).map(v=>new Types.ObjectId(v));
    if(userOIds.length>2) {
      const newConv = await this.conversationModel.create(
        { "participants":userOIds.map(userOid=>({id:userOid, role:'admin'})), type:'g' })
        console.log('create gr chat:',newConv);
        if(newConv) return newConv;
        else throw new Error('error while create new conv');
      }
    else throw new Error(`invalid length`);
  }

  async addParticipant({convId, userId, newUserId}:{convId:string, userId:string, newUserId:string}):Promise<boolean>{
    const convOid = new Types.ObjectId(convId);
    const userOid = new Types.ObjectId(userId);
    const newUserOid = new Types.ObjectId(newUserId);
    const getAdminRole = await this.conversationModel.aggregate(getAdminRole_CheckTargetExist({userOid,convOid,targetUserOid:newUserOid}));
    if(getAdminRole.find(c=>c.participants?.id.equals(userOid))) 
      if(!getAdminRole.find(c=>c.participants?.id.equals(newUserOid))){
      const updateRes = await this.conversationModel.updateOne(
        { "_id":convOid},
        { $push: { "participants": { id: newUserOid } } }
      )
        if(updateRes.modifiedCount==1) return true;
        else throw new Error("Update failed");
    } else throw new HttpException('user already in the chat',HttpStatus.CONFLICT);
    else throw new HttpException('user is not admin', HttpStatus.UNAUTHORIZED);
  }

  async removeParticipant({convId, userId, targetUserId}:{convId:string, userId:string, targetUserId:string}):Promise<boolean>{
    const convOid = new Types.ObjectId(convId);
    const userOid = new Types.ObjectId(userId);
    const targetUserOId = new Types.ObjectId(targetUserId);
    const getAdminRole = await this.conversationModel.aggregate(getConvAdminRole_Pipeline({userOid,convOid}));
    if(getAdminRole[0]?.participants?.id.equals(userOid)) {
      const updateRes = await this.conversationModel.updateOne(
        { "_id":convOid},
        { $pull: { "participants": { id: targetUserOId } } }
      )
        if(updateRes.modifiedCount==1) return true;
        else throw new Error("Update failed");
    }
    else throw new HttpException('user is not admin', HttpStatus.UNAUTHORIZED);
  }

  async leaveGroupChat({convId, userId}:{convId:string, userId:string}):Promise<boolean>{
    const convOid = new Types.ObjectId(convId);
    const userOid = new Types.ObjectId(userId);
    const updateRes = await this.conversationModel.updateOne(
      { "_id":convOid},
      { $pull: { "participants": { id: userOid } } }
    )
    if(updateRes.modifiedCount==1) return true;
    else throw new Error("Update failed");
  }

  async getGroupChatIds(userId:string):Promise<string[]>{
    const groupIds = await this.conversationModel.aggregate(getGroupChatIds(userId));
    return groupIds.map(v=>v._id.toString());
  }

  async updateNewMsg({convId,newMsgId,actUser}:{convId:string, newMsgId:string, actUser:string}){
    const ObjectId = Types.ObjectId;
    const convUpdateRes = await this.conversationModel.findOneAndUpdate(
      {_id:new ObjectId(convId),...actUser?{"participants.id": new ObjectId(actUser)}:{}},
      {$set:{lastMsg:new ObjectId(newMsgId)},"participants.$.seenMsg": new ObjectId(newMsgId),"participants.$.seenAt":new Date()},
      {returnDocument:"after"})
    return convUpdateRes;
  }

  async updateConv({userId,updateInput}:{userId:string,updateInput: UpdateConversationInput}):Promise<Conversation> {
    const userOid = new Types.ObjectId(userId)
    const convOid = new Types.ObjectId(updateInput.convId)
    const getAdminRole = await this.conversationModel.aggregate(getConvAdminRole_Pipeline({userOid,convOid}));
    if(getAdminRole[0]?.participants?.id.equals(userOid)) {
      let updateQuery:{img:string}|{name:string};
      if(updateInput.img) {
        const imgLinks = await this.firebaseService.uploadImage([updateInput.img])
        updateQuery = {img:imgLinks[0]};
      }
      else if(updateInput.name) updateQuery = {name:updateInput.name};
      else throw new HttpException("Invaild input",HttpStatus.BAD_REQUEST);
      const updateRes = await this.conversationModel.findOneAndUpdate(
        { _id: convOid},
        { $set: updateQuery},
        {returnDocument:"after",projection:{_id:1,img:1,name:1}});
      console.log('auth update conv res:',updateRes);
      if(updateRes) return updateRes;
      else throw new Error('No update res');
    } else throw new HttpException("User isn't admin",HttpStatus.FORBIDDEN);
  }

  async updateParticipant({userId,updateInput}:{userId:string,updateInput: UpdateParticipantInput})
    :Promise<Conversation> {
    const userOid = new Types.ObjectId(userId)
    const convOid = new Types.ObjectId(updateInput.convId)
    let targetUserOId:Types.ObjectId;
    let updateQuery:{"participants.$.nickname":string}|{"participants.$.role":ConversationRole}
      |{"participants.$.seenMsg":Types.ObjectId,"participants.$.seenAt":Date};
    let isValid:boolean=false;

    // Update participant
    if(updateInput.targetUserId) {
      if(updateInput.role) {
        updateQuery = {"participants.$.role":updateInput.role}
        // set role require admin role
        const getAdminRole:{participants:Participant}[]  = await this.conversationModel.aggregate(getConvAdminRole_Pipeline({userOid,convOid}));
        console.log('auth get admin role: ',getAdminRole);
        if(getAdminRole[0]?.participants?.id.equals(userOid)) isValid=true; 
      }
      else if(updateInput.nickname) {
        updateQuery = {"participants.$.nickname":updateInput.nickname}; // set nickname don't require admin role
        isValid=true;
      }
      else throw new HttpException('Invalid Input', HttpStatus.BAD_REQUEST);
      targetUserOId = new Types.ObjectId(updateInput.targetUserId);
      
    }
    else if(updateInput.seenMsg) { // see a message
      updateQuery = {"participants.$.seenMsg":new Types.ObjectId(updateInput.seenMsg),"participants.$.seenAt":new Date()};
      targetUserOId = userOid;
      isValid=true;
    }
    else throw new HttpException('Invalid Input', HttpStatus.BAD_REQUEST);

    if(isValid) {
      const updateRes = await this.conversationModel.findOneAndUpdate(
        { _id: convOid, "participants.id": targetUserOId},
        { $set: updateQuery},
        {returnDocument:"after"});
      return updateRes;
    } else throw new HttpException("User isn't admin",HttpStatus.FORBIDDEN);
  }

  // Load 5 user data, prioritize user seen the last msg;
  transformLatestConv(convData:Conversation[]) {
    const userIds = new Set<string>(); // Store unique user IDs
    const collect = (id?:ObjectId) => id && userIds.add(id.toString());
    let transformConvData:LatestConversation[]=[];
    let latestMessageSumary:MessageSumary[]=[];

    // Loop through conversations and collect unique user IDs
    convData.forEach((conv) => {
      const {participants,lastMsgData} = conv;
      collect(lastMsgData.user);
      let seenUsers:ObjectId[] = [];
      let someUsers:ObjectId[] = [];
      let count=0;
      let lastMsgUserNickname:string;
      const pLength = participants.length;
      for(let i=0; i<pLength;i++) {
        if(participants[i].id.equals(lastMsgData.user)) lastMsgUserNickname=participants[i].nickname;
        if(participants[i].seenMsg?.equals(lastMsgData._id)) {
            collect(participants[i].id);
            seenUsers.push(participants[i].id);
            count++;
          }
        else if ( (i-count)>=(pLength-5)){
            collect(participants[i].id);
            someUsers.push(participants[i].id);
            count++;
        }
        if(count>4) break;
      };
      collect(lastMsgData.user);
      const msgSumary:MessageSumary =
          {cont:lastMsgData.cont||(lastMsgData.media?.length+" media(s)")||lastMsgData.status, 
            _id:lastMsgData._id,
            user:lastMsgData.user,
            userNickname:lastMsgUserNickname,
            status:lastMsgData.status,
            type:lastMsgData.type,
            act:lastMsgData.act};
      latestMessageSumary.push(msgSumary);
      transformConvData.push({...{...conv,lastMsgData:undefined
        ,participants:conv.type?undefined:participants} // not return participants data for group chat since it's often large data
        ,lastMsg:msgSumary._id,seenUsers,someUsers})
    });
    
    return {transformConvData, userIds:Array.from(userIds),latestMessageSumary};
  }

  // Load all user data if participant <10, or ones with message seen, rep, react on msg with <5 react, 
  getParticipants_FromConvMsg(convData:DetailConversation) {
    const userIdsSet = new Set<string>(); // Store unique user IDs
    const participantsMap = new Map<string,Participant>();
    const participantsArr:Participant[]=[];
    const collect = (id:ObjectId) => {
      const strId=id.toString();
      if(!userIdsSet.has(strId)) {
        userIdsSet.add(strId); 
        participantsArr.push(participantsMap.get(strId))};
    }

    // Create a map
    let seenMsgMap = new Map<string,Participant[]>();
    if(convData.participants.length<100) {
      convData.participants.forEach(participant => {
        participantsMap.set(participant.id.toString(),participant);
        const strSeenMsgId = participant.seenMsg.toString();
        if (!seenMsgMap.has(strSeenMsgId)) {
          seenMsgMap.set(strSeenMsgId, [participant]);
        } else {
          seenMsgMap.get(strSeenMsgId).push(participant);
        }
      });
    }
    // Loop through conversations and collect unique user IDs
    convData.messages.forEach((msg) => {
      const strMsgId = msg._id.toString();
      collect(msg.user);
      if(msg.repMsg) collect(msg.repMsg.user);
      if(msg.react?.length<=5) msg.react.forEach(r=>collect(r.user))
      if(seenMsgMap.has(strMsgId)) seenMsgMap.get(strMsgId).forEach(v=>collect(v.id));
    });
    
    return {userIds:Array.from(userIdsSet),participantsArr}
  }
}
