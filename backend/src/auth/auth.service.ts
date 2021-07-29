import { forwardRef, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { User } from 'src/user/entities/user.entity';
import { FindConditions, Repository } from 'typeorm';
import { compare } from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    @Inject(forwardRef(() => UserService))
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(login: string, pass: string) {
    const searchOptions: FindConditions<User> = {};

    if (login.includes('@')) {
      searchOptions.email = login;
    } else {
      searchOptions.login = login;
    }
    const user = await this.userService.find(searchOptions);

    if (!user) return null;

    const isValid = await compare(pass, user.password);

    if (!isValid) return null;

    const { password, ...userData } = user;
    return userData;
  }

  async verifyToken(token: string) {
    const payload = this.jwtService.verify(token);
    return payload;
  }

  async login(user: any) {
    const { password, ...payload } = user;

    return {
      access_token: this.jwtService.sign(payload),
    };
  }
}
