import { ConversationObjType as Conversation_ObjType, LatestConversation } from "src/conversation/entities/conversation.entity";
import { ConversationRole } from "src/conversation/entities/participant.entity";
import { SendMessageInput } from "src/message/dto/send-message.input";
import { UserReactInput } from "src/message/dto/update-message.input";
import { MongoDB_ActionMessage } from 'src/message/entities/message.entity';
import { Message } from "src/message/schemas/message.schemas";
import { UpdateUserInput } from "src/users/dto/update-user.input";
import { User } from "src/users/schemas/user.schema";

export enum SocketEvent {
  Connect = "connect",
  Disconnect = "disconnect",
  // Emit events
  sendMsg="sendMsg",
  reactMsg="reactMsg",
  unsendMsg="unsendMsg",
  hideMsg="hideMsg",
  seeMsg="seeMsg",
  updateUser="updateUser",
  checkUsername="checkUsername",
  getOnlineStatus="getOnlineStatus",
  updateParticipant="updatePtcp",
  updateConversation="updateConv",
  getUsersData="getUsersData",
  createGroupChat="createGroupChat",
  addPtcp="addPtcp",
  removePtcp="removePtcp",
  leaveGroupChat="leaveGroupChat",
  // On events
  newMsg = "newMsg",
  newMsgReact="newMsgReact",
  newUnsentMsg="newUnsentMsg",
  newHideMsg="newHideMsg",
  newSeenMsgUser="newSeenMsgUser",
  newUpdateStatus="newUpdateStatus",
  newUsernameCheck="newUsernameCheck",
  newOnlineStatus="newOnlineStatus",
  newParticipantUpdate="newPtcpUpdate",
  newConvUpdate="newConvUpdate",
  newUsersData="newUsersData",
  newGroupChat="newGroupChat",
  newPtcpAction="newPtcpAction",
  Error = "error",
  ConnectError = "connect_error"
}

export interface ServerToClientEvents {
    noArg: () => void;
    [SocketEvent.newMsg]:(msg:Message)=>void;
    [SocketEvent.newMsgReact]:(msgReact:UserReactInput)=>void;
    [SocketEvent.newUnsentMsg]:(res:{msgId:string})=>void;
    [SocketEvent.newHideMsg]:(res:{convId:string, msgId:string,status:'ok'|'err'})=>void;
    [SocketEvent.newSeenMsgUser]:(res:{convId:string, userId:string, msgId:string})=>void;
    [SocketEvent.newUpdateStatus]:(res:UpdateUserData)=>void;
    [SocketEvent.newUsernameCheck]:(res:{username:string,status:UsernameCheckStatus})=>void;
    [SocketEvent.newOnlineStatus]:(res:Pick<User,"_id"|"lastAct">[])=>void;
    [SocketEvent.newConvUpdate]:(res:{actionMsg:MongoDB_ActionMessage,msgCode?:undefined}|{msgCode:string,actionMsg?:undefined})=>void;
    [SocketEvent.newParticipantUpdate]:(res:{actionMsg:MongoDB_ActionMessage,msgCode?:undefined}|{msgCode:string,actionMsg?:undefined})=>void;
    [SocketEvent.newUsersData]:(res:User[])=>void;
    [SocketEvent.newGroupChat]:(res:{conv:Conversation_ObjType,msg:MongoDB_ActionMessage})=>void;
    [SocketEvent.newPtcpAction]:(res:{convId:string,msg:MongoDB_ActionMessage,msgCode?:'failed'|'ok'})=>void;
    [SocketEvent.Error]:(e:Error)=>void;
  }

interface ClientData {
  targetId?:string,
}
export interface ClientData_SendMsg extends ClientData {
  msg:SendMessageInput
};

export interface ClientData_ReactMsg extends ClientData {
  reaction:UserReactInput
};

export interface ClientData_UnsendMsg extends ClientData {
  targetId?:string, msgId:string,convId:string
}

export interface ClientData_HideMsg extends ClientData {
  targetId?:string, msgId:string,convId:string
};

export interface ClientData_SeeMsg extends ClientData {
  targetId?:string, convId:string,msgId:string
};

export interface ClientToServerEvents {
    [SocketEvent.sendMsg]: (data:ClientData_SendMsg)=> void;
    [SocketEvent.reactMsg]: (data:ClientData_ReactMsg)=> void;
    [SocketEvent.unsendMsg]: (data:ClientData_UnsendMsg)=>void;
    [SocketEvent.hideMsg]: (data:ClientData_HideMsg)=>void;
    [SocketEvent.seeMsg]: (data:ClientData_SeeMsg)=>void;
    [SocketEvent.updateUser]: (data:UpdateUserInput)=>void;
    [SocketEvent.checkUsername]: (data:{username:string})=>void;
    [SocketEvent.getOnlineStatus]: (data:{userIds:string[]})=>void;
    [SocketEvent.updateParticipant]: (data:UpdateParticipantInput)=>void;
    [SocketEvent.updateConversation]: (data:UpdateConversationInput)=>void;
    [SocketEvent.getUsersData]:(data:{userIds:string[]})=>void;
    
    [SocketEvent.createGroupChat]:(data:{userIds:string[]})=>void;
    [SocketEvent.addPtcp]:(data:{convId:string,newUserId:string})=>void;
    [SocketEvent.removePtcp]:(data:{convId:string,targetUserId:string})=>void;
    [SocketEvent.leaveGroupChat]:(data:{convId:string})=>void;
  }
  
export interface InterServerEvents {
    ping: () => void;
  }
  
export interface SocketData {
    name: string;
    age: number;
  }

export type UsernameCheckStatus = 'exist'|'available';
  
type UpdateUserData= 
{ username: string}|
  {displayName: string}|
  {prfImg: string;}|
  {msgCode:string}

export type UpdateParticipantInput = {targetUserId?: string, convId:string, dirrectUserId?:string} & 
({ nickname?: string, role?:ConversationRole, seenMsg?:string})

export type UpdateConversationInput = { convId:string} & ({name: string, img?:undefined } | { img:string, name?:undefined })