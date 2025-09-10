import { Body, Controller, Logger, Post, UseGuards } from '@nestjs/common';
import {
  CreateSessionDto,
  CreateSportsBookSession,
} from '../dto/create-session.dto';
import { SlotegratorService } from '../service/slotegrator.service';
import { UserContext } from '@common/decorators/user-context.decorator';
import { JwtPayload } from '@modules/authentication/types';
import { PrismaService } from '@infrastructure/database/prisma/prisma.service';
import { Public } from '@common/decorators/public-route.decorator';
import { OptionalJwtGuard } from '@modules/authentication/core/guards/optional-jwt.guard';

@Controller('slotegrator')
export class SlotegratorSessionController {
  private readonly _logger = new Logger(SlotegratorSessionController.name);

  constructor(
    private readonly slotegratorService: SlotegratorService,
    private readonly prismaService: PrismaService,
  ) {}

  @Public()
  @Post('session')
  @UseGuards(OptionalJwtGuard)
  async createSession(
    @UserContext() userCtx: JwtPayload,
    @Body() body: CreateSessionDto,
  ): Promise<{ url: string }> {
    this._logger.log('Creating session', body);

    const session = await this.slotegratorService.createSession({
      slug: body.slug,
      userId: userCtx?.sub,
      demo: body.demo,
      return_url: body.returnUrl,
    });

    return {
      url: session,
    };
  }

  @Post('sportsbook/session')
  async createSportsBookSession(
    @UserContext() { sub }: JwtPayload,
    @Body() body: CreateSportsBookSession,
  ): Promise<{ url: string; token: string }> {
    const user = await this.prismaService.user.findUnique({
      where: {
        id: sub,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const session = await this.slotegratorService.createSportsBookSession({
      userId: user.id,
      userNickname: user.nickname ?? user.playerTag,
      language: body.language,
    });

    return {
      url: session.url,
      token: session.token,
    };
  }
}
