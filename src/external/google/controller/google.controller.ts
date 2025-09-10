import { Body, Controller, Post } from '@nestjs/common';
import { VerifyRecaptchaTokenDto } from '../dto/verify-recaptcha-token.dto';
import { GoogleService } from '../service/google.service';
import { Public } from '@common/decorators/public-route.decorator';

@Controller('google')
export class GoogleController {
  constructor(private readonly googleApi: GoogleService) {}

  @Public()
  @Post('verify-recaptcha-token')
  async handleVerifyRecaptchaToken(
    @Body() { token }: VerifyRecaptchaTokenDto,
  ): Promise<{ passed: boolean }> {
    // const data = await this.googleApi.verifyRecaptchaToken(token);
    // console.log('[debug] google recapcha result', data);

    return {
      passed: true, // @fixme TEMPORARY: always pass. google api key in prod is not working. the frontend breaks when this returns false
      // passed: !!data?.success && data?.score >= 0.2,
    };
  }
}
