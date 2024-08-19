import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { jwtConstants } from '../constants';
import { Request } from 'express';

const JWTFromCookieExtractor = function(req:Request) {
  let token = null;
  const cookies = req?.headers?.cookie
  token = getJwtFromCookie(cookies);
  console.log('get jwt from token:',token);
  return token;
};

export const getJwtFromCookie = function(cookies:string) {
  if (cookies) {
    return cookies.split('; ').find(v=>v.substring(0,4)=='jwt=')?.substring(4);
  } else return undefined;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: JWTFromCookieExtractor,
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret,
    });
  }


  async validate(payload) {
    return { userId: payload.uid };
  }
}