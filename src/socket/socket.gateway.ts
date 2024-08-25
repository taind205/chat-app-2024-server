import { WebSocketGateway, SubscribeMessage, MessageBody, WebSocketServer, ConnectedSocket, WsResponse, OnGatewayInit } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { ConversationService } from "src/conversation/conversation.service";
import { MessageService } from "src/message/message.service";
import { UsersService } from "src/users/users.service";
import { FirebaseService } from "../firebase/firebase.service";
import { ClientData_HideMsg, ClientData_ReactMsg, ClientData_SeeMsg, ClientData_SendMsg, ClientData_UnsendMsg, ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData, SocketEvent, UpdateConversationInput, UpdateParticipantInput } from "./socket.type";
import { HttpException, HttpStatus, Inject, UseGuards } from "@nestjs/common";
import { getJwtFromCookie } from "src/auth/strategy/jwt.strategy";
import { JwtService } from "@nestjs/jwt";
import { UpdateUserInput } from "src/users/dto/update-user.input";
import { ActionMessage } from "src/message/entities/message.entity";
import * as dotenv from 'dotenv';

const getClientDomain = () => {
  dotenv.config();
  return process.env.CLIENT_DOMAIN
}

@WebSocketGateway({
  cors: {
    origin: getClientDomain(),
    credentials: true,
  },
})

export class ChatGateway implements OnGatewayInit {
  constructor(
    private readonly firebaseService: FirebaseService,
    private usersService: UsersService,
    private conversationService: ConversationService,
    private messageService: MessageService,
    private jwtService: JwtService
  ) {
    // Update online status for all user every 20 seconds
    setInterval(async () => { 
      await this.usersService.updateOnlineStatus(this.connectedUsers); 
    }, 1000*20);
  }

    @WebSocketServer()
    server: Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >;

    private connectedUsers = new Set<string>();

    afterInit(server:Server){
      server.use(async (socket,next)=>
      {
        try {
          const jwt = socket.handshake.auth['token'];
          const payload:{uid:string} = this.jwtService.verify(jwt)
          const uid = payload.uid;
          socket['uid']=String(uid);
          this.usersService.updateOnlineStatus(String(uid));
          this.connectedUsers.add(uid);
          if(uid) { const groupIds = await this.conversationService.getGroupChatIds(uid);
            socket.join([uid].concat(groupIds));
            next();
          }
          else next(new Error("uid is invalid..."));
        } catch(err) {
          next(new Error("invalid..."));
        }
      })
    }

    @SubscribeMessage(SocketEvent.Disconnect)
    handleDisconnect(client: Socket) {
      const userId = client['uid'];
      this.connectedUsers.delete(userId);
  }

    @SubscribeMessage(SocketEvent.sendMsg)
    async handleSendMsg(
    @MessageBody() data:ClientData_SendMsg,
    @ConnectedSocket() client: Socket,
    ): Promise<WsResponse<unknown>> {
        
        let {msg:input,targetId} = data
        if((!input.cont || !input.cont.trim()) && (!input.imgFiles || input.imgFiles.length==0) ) return { event:"actStt", data:"invalidInput" };
        try{
          const userId = client['uid'];
          if(userId!=input.user) throw new Error('unauthorized msg sent')
          if(input.imgFiles){
            //Handle image input
            const imgLinks = await this.firebaseService.uploadImage(input.imgFiles) 
            delete input.imgFiles;
            input = {...input,media:imgLinks}
          }
          
          const {newMessage,conversation} = await this.messageService.sendMessage({msg:input,targetUserId:targetId});
          const roomId = targetId? [targetId,input.user]: input.conv;
          if(input.user) this.server.to(roomId).emit(SocketEvent.newMsg, newMessage)
        } catch(err) {
           return { event:"actionStatus", data:"err" };
        }
    }

    @SubscribeMessage(SocketEvent.reactMsg)
    async handleReactMsg(
    @MessageBody() data:ClientData_ReactMsg,
    @ConnectedSocket() client: Socket,
    ): Promise<WsResponse<unknown>> {
        try{          
          const userId = client['uid'];
          const {targetId,reaction} = data;
          if(reaction.user!=userId) throw new Error('unathorize reaction');
          const res = await this.messageService.update({type:'react',data:reaction});
          const roomId = targetId?[targetId,reaction.user]:reaction.convId;
          if(res) this.server.to(roomId).emit(SocketEvent.newMsgReact, reaction)
        } catch(err) {
           return { event:"actionStatus", data:"err" };
        }
    }

    @SubscribeMessage(SocketEvent.unsendMsg)
    async handleUnsendMsg(
    @MessageBody() data: ClientData_UnsendMsg,
    @ConnectedSocket() client: Socket,
    ): Promise<WsResponse<unknown>> {
        try{          
          const userId = client['uid'];
          const res = await this.messageService.update({type:'unsend', data:{userId,...data}});
          const roomId = data.targetId?[data.targetId,userId]:data.convId;
          if(res) this.server.to(roomId).emit(SocketEvent.newUnsentMsg, {msgId:data.msgId})
        } catch(err) {
           return { event:"actionStatus", data:"err" };
        }
    }

    @SubscribeMessage(SocketEvent.hideMsg)
    async handleHideMsg(
    @MessageBody() data: ClientData_HideMsg,
    @ConnectedSocket() client: Socket,
    ): Promise<WsResponse<unknown>> {
        const userId = client['uid'];
        try{          
          const res = await this.messageService.update({type:'hide', data:{userId,...data}});
          if(res) this.server.to(userId).emit(SocketEvent.newHideMsg, {...data,status:'ok'});
          else throw new Error('err: no res');
          return { event:"actionStatus", data:"ok" };
        } catch(err) {
          return { event:"actionStatus", data:"err" };
        }
    }

    @SubscribeMessage(SocketEvent.seeMsg)
    async handleSeeMsg(
    @MessageBody() data: ClientData_SeeMsg,
    @ConnectedSocket() client: Socket,
    ): Promise<WsResponse<unknown>> {
      const userId = client['uid'];
        try{          
          const res = await this.conversationService.updateParticipant({userId,updateInput:{seenMsg:data.msgId,convId:data.convId}})
          const roomId = data.targetId?[data.targetId,userId]:data.convId;
          if(res) this.server.to(roomId).emit(SocketEvent.newSeenMsgUser, {...data,userId})
          else throw new Error('err: no res');
          return { event:"actionStatus", data:"ok" };
        } catch(err) {
          return { event:"actionStatus", data:"err" };
        }
    }

    @SubscribeMessage(SocketEvent.updateUser)
    async handleUpdateUserProfile(
    @MessageBody() data: UpdateUserInput,
    @ConnectedSocket() client: Socket,
    ): Promise<WsResponse<unknown>> {
      const userId = client['uid'];
        try{          
          const res = await this.usersService.update({userId,updateInput:data});
          const roomId = userId;
          if(res) this.server.to(roomId).emit(SocketEvent.newUpdateStatus, res)
          else throw new Error('err: no res');
        } catch(err) {
          this.server.to(userId).emit(SocketEvent.newUpdateStatus, {msgCode:'updateFailed'})
          return { event:"actionStatus", data:"err" };
        }
    }

    @SubscribeMessage(SocketEvent.checkUsername)
    async handleCheckUsername(
    @MessageBody() data: {username:string},
    @ConnectedSocket() client: Socket,
    ): Promise<WsResponse<unknown>> {
      const userId = client['uid'];
        try{          
          const res = await this.usersService.checkUsername(data);
          const roomId = userId;
          if(res) this.server.to(roomId).emit(SocketEvent.newUsernameCheck, {username:data.username, status:res.msgCode})
          else throw new Error('err: no res');
        } catch(err) {
          return { event:"actionStatus", data:"err" };
        }
    }

    @SubscribeMessage(SocketEvent.getOnlineStatus)
    async handleGetOnlineStatus(
    @MessageBody() data: {userIds:string[]},
    @ConnectedSocket() client: Socket,
    ): Promise<WsResponse<unknown>> {
      const userId = client['uid'];
        try{
          const res = await this.usersService.getOnlineStatus(data.userIds);
          const roomId = userId;
          if(res) this.server.to(roomId).emit(SocketEvent.newOnlineStatus, res)
          else throw new Error('err: no res');
        } catch(err) {
          return { event:"actionStatus", data:"err" };
        }
    }
    
    @SubscribeMessage(SocketEvent.getUsersData)
    async handleGetUsersData(
    @MessageBody() data: {userIds:string[]},
    @ConnectedSocket() client: Socket,
    ): Promise<WsResponse<unknown>> {
      const userId = client['uid'];
        try{
          if(userId.length>250) throw new HttpException('Get too many', HttpStatus.PAYLOAD_TOO_LARGE);
          const res = await this.usersService.findSome(data.userIds);
          const roomId = userId;
          if(res) this.server.to(roomId).emit(SocketEvent.newUsersData, res)
          else throw new Error('err: no res');
        } catch(err) {
          return { event:"actionStatus", data:"err" };
        }
    }

    @SubscribeMessage(SocketEvent.updateConversation)
    async handleUpdateConversation(
    @MessageBody() data: UpdateConversationInput,
    @ConnectedSocket() client: Socket,
    ): Promise<WsResponse<unknown>> {
      const userId = client['uid'];
        try{          
          const res = await this.conversationService.updateConv({userId,updateInput:data});
          if(!res) throw new Error(`update failed ${data}`);
          const actionMsg:Omit<ActionMessage,"_id">= {conv:res._id.toString(),...
          data.img?{type:"changeGroupPhoto",act:{by:userId,value:res.img}}
          :data.name?{type:"changeGroupName",act:{by:userId,value:res.name}}
          :undefined};
          if(!actionMsg) throw new Error(`Wrong input: ${data}`)
          const newMsg = await this.messageService.addActionMessage({actionMsg});
          if(!newMsg) throw new Error(`Add action msg failed ${data}`);
          const roomId = res._id.toString();
          this.server.to(roomId).emit(SocketEvent.newConvUpdate, {actionMsg:newMsg})
          return { event:SocketEvent.newConvUpdate, data:{msgCode:"ok"} };
        } catch(err) {
          return { event:SocketEvent.newConvUpdate, data:{msgCode:'failed'} };
        }
    }

    @SubscribeMessage(SocketEvent.updateParticipant)
    async handleUpdateParticipant(
    @MessageBody() data: UpdateParticipantInput,
    @ConnectedSocket() client: Socket,
    ): Promise<WsResponse<unknown>> {
      const userId = client['uid'];
        try{
          const res = await this.conversationService.updateParticipant({userId,updateInput:data});
          let newParticipant = res.participants.find(v=>v.id.equals(data.targetUserId))
          if(!newParticipant) throw new Error('Data is wrong, not found participant just updated in a conv');
          const actionMsg:Omit<ActionMessage,"_id"> = {conv:res._id.toString(),...
              data.nickname?{type:'setNickname',act:{by:userId,target:newParticipant.id.toString(),value:newParticipant.nickname}}
              :data.role?{type:'setRole',act:{by:userId,target:newParticipant.id.toString(),value:newParticipant.role}}
              :undefined};
          if(!actionMsg) throw new Error(`Wrong input: ${data}`);
          const newMsg = await this.messageService.addActionMessage({actionMsg});
          if(!newMsg) throw new Error(`add act msg failed ${res}`);
          const roomId = [userId,data.dirrectUserId||data.convId];
          this.server.to(roomId).emit(SocketEvent.newParticipantUpdate, {actionMsg:newMsg});
          return { event:SocketEvent.newParticipantUpdate, data:{msgCode:"ok"} };
        } catch(err) {
          return { event:SocketEvent.newParticipantUpdate, data: {msgCode:'failed'} };
        }
    }

    @SubscribeMessage(SocketEvent.createGroupChat)
    async handleCreateGroupChat(
    @MessageBody() data:{userIds:string[]},
    @ConnectedSocket() client: Socket,
    ): Promise<WsResponse<unknown>> {
      const userId = client['uid'];
        try{
          const {userIds} = data;
          const newConv = await this.conversationService.createGroupChat({userIds:userIds.concat(userId)});
          const newMsg = await this.messageService.addActionMessage(
            {actionMsg:{type:'createChat',act:{by:userId},conv:newConv._id.toString()}});
          const convId = newConv._id.toString()
          this.server.in(newConv.participants.map(v=>v.id.toString())).socketsJoin(convId);
          const roomId = convId;
          this.server.to(roomId).emit(SocketEvent.newGroupChat, {conv:newConv,msg:newMsg})
        } catch(err) {
          return { event:"actionStatus", data: {msgCode:'failed'} };
        }
    }

    @SubscribeMessage(SocketEvent.addPtcp)
    async handleAddPtcp(
    @MessageBody() data:{convId:string,newUserId:string},
    @ConnectedSocket() client: Socket,
    ): Promise<WsResponse<unknown>> {
      const userId = client['uid'];
        try{
          const {convId,newUserId} = data;
          const updateRes = await this.conversationService.addParticipant({convId,userId,newUserId});
          if(!updateRes) throw new Error('action failed')
          const newMsg = await this.messageService.addActionMessage(
            {actionMsg:{type:'addMember',act:{by:userId,target:newUserId},conv:convId}});
          this.server.in(newUserId).socketsJoin(convId);
          const roomId = convId;
          this.server.to(roomId).emit(SocketEvent.newPtcpAction, {convId,msg:newMsg})
        } catch(err) {
          return { event:"actionStatus", data: {msgCode:'failed'} };
        }
    }
    
    @SubscribeMessage(SocketEvent.removePtcp)
    async handleRemovePtcp(
    @MessageBody() data:{convId:string,targetUserId:string},
    @ConnectedSocket() client: Socket,
    ): Promise<WsResponse<unknown>> {
      const userId = client['uid'];
        try{
          const {convId,targetUserId} = data;
          const updateRes = await this.conversationService.removeParticipant({convId,userId,targetUserId});
          if(!updateRes) throw new Error('update failed');
          const newMsg = await this.messageService.addActionMessage(
            {actionMsg:{type:'removeMember',act:{by:userId,target:targetUserId},conv:convId}});
          const roomId = convId;
          this.server.to(roomId).emit(SocketEvent.newPtcpAction, {convId,msg:newMsg}) 
          this.server.in(targetUserId).socketsLeave(convId);
        } catch(err) {
          return { event:"actionStatus", data: {msgCode:'failed'} };
        }
    }

    @SubscribeMessage(SocketEvent.leaveGroupChat)
    async handleleaveGroupChat(
    @MessageBody() data:{convId:string},
    @ConnectedSocket() client: Socket,
    ): Promise<WsResponse<unknown>> {
      const userId = client['uid'];
        try{
          const {convId} = data;
          const updateRes = await this.conversationService.leaveGroupChat({convId,userId});
          if(!updateRes) throw new Error('update failed')
          const newMsg = await this.messageService.addActionMessage(
            {actionMsg:{type:'leave',act:{by:userId},conv:convId}});
          const roomId = convId;
          this.server.to(roomId).emit(SocketEvent.newPtcpAction, {convId,msg:newMsg})
          this.server.in(userId).socketsLeave(convId);
        } catch(err) {
          return { event:"actionStatus", data: {msgCode:'failed'} };
        }
    }

}