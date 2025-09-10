import { Controller, Post } from '@nestjs/common';
import { GamanzaEngageService } from '../service/gamanza-engage.service';
import { UserContext } from '@common/decorators/user-context.decorator';
import { JwtPayload } from '@modules/authentication/types';
import { UserService } from '@modules/user/services/user.service';
import { NotFoundError } from '@common/error/not-found.error';

@Controller('gamanza')
export class GamanzaEngageSessionController {
  constructor(
    private readonly gamanzaEngageApi: GamanzaEngageService,
    private readonly userService: UserService,
  ) {}

  @Post('session')
  async handleValidateIdentityToken(
    @UserContext() { sub }: JwtPayload,
  ): Promise<{ token: string }> {
    const player = await this.userService.findById(sub);
    if (!player) {
      throw new NotFoundError('Player not found');
    }

    const identityToken = await this.gamanzaEngageApi.signIdentityToken(sub);

    return {
      token: identityToken,
    };
  }
}
