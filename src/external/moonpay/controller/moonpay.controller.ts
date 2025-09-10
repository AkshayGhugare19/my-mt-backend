import { Body, Controller, Post } from '@nestjs/common';
import { MoonPayService } from '../service/moonpay.service';
import { UserContext } from '@common/decorators/user-context.decorator';
import { JwtPayload } from '@modules/authentication/types';
import { UserService } from '@modules/user/services/user.service';
import { NotFoundError } from '@common/error/not-found.error';
import { MoonPaySignUrlDto } from '../dto/sign-url.dto';

@Controller('moonpay')
export class MoonPayController {
  constructor(
    private readonly moonPayApi: MoonPayService,
    private readonly userService: UserService,
  ) {}

  @Post('sign-url')
  async handleSignUrl(
    @UserContext() { sub }: JwtPayload,
    @Body() { url }: MoonPaySignUrlDto,
  ): Promise<{ signature: string }> {
    const user = await this.userService.findById(sub);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const signature = this.moonPayApi.signUrl(url);

    return {
      signature,
    };
  }
}
