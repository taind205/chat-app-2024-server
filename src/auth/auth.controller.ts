import { Controller,Request, Get, Post, Req, UseGuards, Res, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorator';
import { LocalAuthGuard } from './guard/local-auth.guard';
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

  @Public()
  @Post('google/callback')
  async googleCallback(@Body() { code }: { code: string }, @Res({ passthrough: true }) res:ExpressResponse) {
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
    res.cookie('jwt', access_token, {
      httpOnly: true,
      secure: true, // Set secure to true for HTTPS
      maxAge: 3600000,
    });
    return {user:appUser}
  }
  
  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req, @Res({ passthrough: true }) res:ExpressResponse) {
    const {access_token,user} = await this.authService.login(req.user);
    res.cookie('jwt', access_token, {
      httpOnly: true,
      secure: true, // Set secure to true for HTTPS
      maxAge: 3600000,
    });
    return {user}
  }

  @Post('logout')
  async logout(@Request() req, @Res({ passthrough: true }) res:ExpressResponse) {
    res.clearCookie('jwt');
    return {logout:true}
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }
}