import { JwtModuleOptions } from "@nestjs/jwt";

export const jwtConstants = {
  secret: process.env.JWT_SECRET,
};

export const jwtOptions:JwtModuleOptions = {
  secret: jwtConstants.secret,
  signOptions: { expiresIn: '3600s' },
}