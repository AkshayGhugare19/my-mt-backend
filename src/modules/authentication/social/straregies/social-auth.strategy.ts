import { Injectable, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';


export type SocialProfile = {
  provider: 'google' | 'facebook';
  providerUserId: string;     // Google sub or Facebook id
  email?: string | null;
  name?: string | null;
  picture?: string | null;
};

@Injectable()
export class SocialAuthStrategy {

  async validate(input: { idToken: string; type: 'google' | 'facebook' }): Promise<SocialProfile> {
    console.log("input.........................", input)
    if (input.type === 'google') return this.validateGoogle(input.idToken);
    if (input.type === 'facebook') return this.validateFacebook(input.idToken);
    throw new UnauthorizedException('Unsupported provider');
  }

  private async validateGoogle(token: string): Promise<SocialProfile> {
    try {

      const { data } = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        params: { access_token: token },
      });
      console.log("data......................", data)

      if (!data?.id) throw new UnauthorizedException('Invalid Google access token');

      return {
        provider: 'google',
        providerUserId: data.id,
        email: data.email ?? null,
        name: data.name ?? null,
        picture: data.picture ?? null,
      };
    } catch (error) {
      console.error('Google validation failed:', error?.response?.data || error.message);
      throw new UnauthorizedException('Google login failed');
    }
  }

  private async validateFacebook(accessToken: string): Promise<SocialProfile> {
    try {
      // If user granted email scope, FB will return it. If not, email may be undefined.
      const { data } = await axios.get(
        'https://graph.facebook.com/me',
        {
          params: {
            fields: 'id,name,email,picture',
            access_token: accessToken,
          },
          timeout: 10000,
        },
      );

      if (!data?.id) throw new UnauthorizedException('Invalid Facebook token');

      return {
        provider: 'facebook',
        providerUserId: data.id,
        email: data.email ?? null,
        name: data.name ?? null,
        picture: data.picture?.data?.url ?? null,
      };
    } catch (error) {
      console.log("error", error.response)
      throw new UnauthorizedException('Facebook login failed');
    }
  }
}
