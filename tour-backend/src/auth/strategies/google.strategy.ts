import 'dotenv/config';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback, Profile } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;
    const googleId = profile.id;
    const fullName = profile.displayName || email || 'Google User';
    const avatarUrl = profile.photos?.[0]?.value;

    try {
      const user = await this.authService.findOrCreateGoogleUser({
        googleId,
        email: email!,
        fullName,
        avatarUrl,
      });
      done(null, user);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
