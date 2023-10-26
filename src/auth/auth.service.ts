import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {

  // Simulate a user entity from the database to get a test token
  private readonly user_test = {
    userId: 25,
    username: 'test1',
    password: 'test1password',
    role:['admin']
  };

  constructor(private jwtService: JwtService) {}

  /**
   * Generate a test JWT token for the predefined test user.
   * This method is intended for testing purposes only.
   */
  async getTestToken() {
    const payload = { username: this.user_test.username, sub: this.user_test.userId, role:this.user_test.role };
    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}
