import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateUserInput } from './dto/create-user.input';
import { UpdateUserInput } from './dto/update-user.input';
import { UserObjType } from './entities/user.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Types } from 'mongoose';
import { User } from './schemas/user.schema';
import { search_v2_1_aggPipeline, userSearch_v2_1_aggPipeline } from './users.aggPipeline';
import { FirebaseService } from 'src/firebase/firebase.service';
import { UsernameCheckStatus } from 'src/socket/socket.type';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private readonly firebaseService: FirebaseService,
  ) {}

  sampleUserIds = process.env.SAMPLE_USER_IDS.split(',').map(id=>new Types.ObjectId(id))  

  async getSampleUser(): Promise<UserObjType[]>{
    const data = await this.userModel.find({_id: {$in: this.sampleUserIds}}).exec();
    if(data) { 
       return data;  }
    else {throw Error('Error getting sample user...');}
  }

  async findOne(id:string): Promise<UserObjType>{
    const data = await this.userModel.findOne({_id: new Types.ObjectId(id)});
    if(data) { return data;}
    else throw new Error(`error getting user data: id:${id},data:${data}`);
  }

  async findOneOrCreateOneByEmail(user:Omit<UserObjType,'_id'>): Promise<UserObjType>{
    const data = await this.userModel.findOne({email: user.email});
    if(!data?.id) {
      const newUser = await this.userModel.findOneAndUpdate({email: user.email},user,{upsert:true,returnDocument:"after"});
      return newUser;
    }
    else { return data;}
  }

  async search({searchTerm,searchType,userId}:{searchTerm:string, userId:string, searchType:'conv'|'user'}){
    let result = [];
    if(searchType=='conv') {
      result = await this.userModel.aggregate(search_v2_1_aggPipeline(searchTerm,userId));
      if(!result[0].username)
        {
          if(result[0])
            return {users:result[0].users,groups:result[0].groups}
          else return {users:[],groups:[]}
        }
        else {
          const {users, groups, ... props} =  result[0];
          return {users: [props].concat(users.filter(v=>v.username!=props.username)), groups:groups};
        }
    }
    else if(searchType=='user') {
      result = await this.userModel.aggregate(userSearch_v2_1_aggPipeline(searchTerm));
      if(!result[0].username)
        {
          if(result[0])
            return {users:result[0].users}
          else return {users:[]}
        }
        else {
          const {users, ... props} = result[0];
          return {users: [props].concat(users.filter(v=>v.username!=props.username))};
        }
    }
    else throw new Error(`search type is invalid: ${searchType}`);
  }

  async findSome(userIds: string[]) {
    if(userIds.length>1000) throw new HttpException('Users load is too large',HttpStatus.PAYLOAD_TOO_LARGE)
    const r = await this.userModel.find({ _id: {$in:userIds.map(v=>new Types.ObjectId(v))} });
    return r;
  }

  async update({userId,updateInput}:{userId:string,updateInput: UpdateUserInput}):Promise<{msgCode:'updateFailed'|'invalidInput'}|UserObjType> {
    if(new Types.ObjectId(userId)){
      try{
        if(updateInput.username && updateInput.displayName) {
          if(updateInput.username.includes(' ')) return {msgCode:'invalidInput'}
          const newUser = await this.userModel.findOneAndUpdate(
            { _id: new Types.ObjectId(userId)},
            {username:updateInput.username, displayName:updateInput.displayName},
            {returnDocument:"after"});
          return newUser;
        } else if(updateInput.prfImg) {
          const imgLinks = await this.firebaseService.uploadImage([updateInput.prfImg])
          const newUser = await this.userModel.findOneAndUpdate(
            { _id: new Types.ObjectId(userId)},
            {prfImg:imgLinks[0]},
            {returnDocument:"after"});
          return newUser;
        }
      } catch(e) {
        if(typeof e.msgCode=='string') return {msgCode:e.msgCode}
        else return {msgCode:'updateFailed'}
      }
    } else return {msgCode:'invalidInput'}
  }

  async checkUsername({username}:{username:string}):Promise<{msgCode:UsernameCheckStatus}> {
    if(username){
      try{
          const data = await this.userModel.findOne({username:username});
          if(!data?.id) {
          return {msgCode:'available'};
          } else return {msgCode:'exist'};
        } catch(e) {
        throw new Error('error check username')
      }
    } throw new Error('error check username')
  }

  async updateOnlineStatus(userIds:Set<string>|string){
    const userIdsArray = typeof userIds =='string'? [userIds] : Array.from(userIds);
    const res = await this.userModel.updateMany(
      {_id: {$in:userIdsArray.map(userId=> new Types.ObjectId(userId))}},
      { $set: {lastAct:Date.now()}}
    )
    return res;
  }

  async getOnlineStatus(userIds:Array<string>){
    const res = await this.userModel.find(
      {_id: {$in:userIds.map(userId=> new Types.ObjectId(userId))}},
      {_id:1,lastAct:1}
    )
    return res;
  }
}
