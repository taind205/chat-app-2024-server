import { Injectable } from '@nestjs/common';
import { Types } from 'mongoose';
import { UserObjType } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService
    ) {}
    
    async validateUser(uid: string, pass: string): Promise<UserObjType|null> {
        if(pass=='sampleUser'){
        const idx = this.usersService.sampleUserIds.findIndex(v=> new Types.ObjectId(uid).equals(v))
        if(idx!=-1){
            const user = await this.usersService.findOne(uid);
            return user;
        } else return null;
        }
        return null;
    }

    async login(user: UserObjType) {
        const payload = { uid: user._id.toString()};
        return {
            user,
          access_token: this.jwtService.sign(payload),
        };
      }
}
