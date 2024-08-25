import { Controller,Request, Get, Post, Req, UseGuards, Res, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorator';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { Response as ExpressResponse } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { UserObjType } from 'src/users/entities/user.entity';
import { UsersService } from 'src/users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UsersService,
  ) {}

  private readonly oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage'
  )

  private cookieOptions = {
    httpOnly: true,
    secure: true, // Set secure to true for HTTPS
    maxAge: 3600000,
    sameSite: "none" as "none",
  }

  @Public()
  @Post('google/callback')
  async googleCallback(@Body() { code, key }: { code: string, key:string }, @Res({ passthrough: true }) res:ExpressResponse) {
    if(key!=process.env.API_KEY) throw new UnauthorizedException();

    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Use the access token to fetch user information or create a user
    const ticket = await this.oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    const user:Omit<UserObjType,'_id'>={email:payload.email,displayName:payload.name,prfImg:payload.picture}

    // Create or find user based on payload information
    const appUser = await this.userService.findOneOrCreateOneByEmail(user);

    // Generate an authentication token
    const {access_token} = await this.authService.login(appUser);
    return {user:appUser,jwt:access_token};
  }
  
  @Public()
  @Post('login')
  async login(@Body() loginDto: {uid:string,password:string,key:string}, @Request() req,
    @Res({ passthrough: true }) res:ExpressResponse) {
    if(loginDto.key!=process.env.API_KEY) throw new UnauthorizedException();

    const authUser = await this.authService.validateUser(loginDto.uid, loginDto.password);
    if (!authUser) {
      throw new UnauthorizedException();
    }
    
    const {access_token,user} = await this.authService.login(authUser);
    
    return {user, jwt:access_token};
  }

  @Post('logout')
  async logout(@Request() req, @Res({ passthrough: true }) res:ExpressResponse) {
    res.cookie('jwt',undefined,this.cookieOptions); //Clear cookie require sameSite="none" too
    return {logout:true}
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}