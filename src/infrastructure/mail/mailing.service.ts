import { ErrorMessages } from '@common/enums/error-messages.enum';
import { Role, Roles } from '@modules/role/enum/role.enum';
import { ENV } from '@common/env';
import { FailedRequestError } from '@common/error/failed-request.error';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sendgrid, { ClientResponse } from '@sendgrid/mail';
import { hmacSha512Inb64Url } from '@utils/hmac-sha512-in-b64-url';
import { readFileSync } from 'fs';
import { Options, minify } from 'html-minifier-terser';
import { htmlToText } from 'html-to-text';
import path from 'path';

const MINIFYOPTIONS = {
  removeAttributeQuotes: true,
  collapseWhitespace: true,
  removeComments: true,
};

@Injectable()
export class MailingService implements OnModuleInit {
  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.setupSendgrid();
  }

  private setupSendgrid(): void {
    const sendgridApiKey = this.configService.get<string>(ENV.SENDGRID_API_KEY);

    if (!sendgridApiKey) return;

    sendgrid.setApiKey(sendgridApiKey);
  }

  async sendForgotPasswordMail(userEmail: string, userRole: Role, code: string): Promise<[ClientResponse, {}]> {
    const mailingDomain = this.configService.get<string>(ENV.MAILING_DOMAIN);

    if (!mailingDomain) throw Error(ErrorMessages.MAILING_DOMAIN_NOT_SET);

    const isAdmin = Roles.USER !== userRole && Roles.VIP_USER !== userRole;

    const webUrl = isAdmin
      ? `${this.configService.get<string>(ENV.ADMIN_APP_BASE_URL)}/login`
      : this.configService.get<string>(ENV.WEB_APP_BASE_URL);

    const hashKey = this.configService.getOrThrow<string>(ENV.MAILING_HASH_KEY);

    const template = await this.getTemplate(
      {
        date: new Date().toLocaleDateString(),
        url: `${webUrl}?code=${code}&email=${hmacSha512Inb64Url(hashKey, userEmail)}`,
      },
      path.join(__dirname, 'templates/reset-password.html'),
    );
    try {
      return await sendgrid.send({
        from: {
          name: 'Moneytree',
          email: mailingDomain,
        },
        to: userEmail,
        subject: 'Password reset request',
        html: template.html,
      });
    } catch (error) {
      Logger.error(
        {
          message: error.message,
          data: error.response?.body,
        },
        'MailingService.sendForgotPasswordMail',
      );

      throw new FailedRequestError(error.message, 'MailingService.sendForgotPasswordMail', error);
    }
  }

  async sendVerifyEmailMail(userEmail: string, code: string): Promise<[ClientResponse, {}]> {
    const mailingDomain = this.configService.get<string>(ENV.MAILING_DOMAIN);
    if (!mailingDomain) throw Error(ErrorMessages.MAILING_DOMAIN_NOT_SET);

    const webUrl = this.configService.get<string>(ENV.WEB_APP_BASE_URL);

    const hashKey = this.configService.getOrThrow<string>(ENV.MAILING_HASH_KEY);
    const url = `${webUrl}?veCode=${code}&email=${hmacSha512Inb64Url(hashKey, userEmail)}`;

    const template = await this.getTemplate(
      {
        date: new Date().toLocaleDateString(),
        url,
      },
      path.join(__dirname, 'templates/verify-email.html'),
    );
    try {
      return await sendgrid.send({
        from: {
          name: 'Moneytree',
          email: mailingDomain,
        },
        to: userEmail,
        subject: 'Verify your email address',
        html: template.html,
      });
    } catch (error) {
      Logger.error(
        {
          message: error.message,
          data: error.response?.body,
        },
        'MailingService.sendVerifyEmailMail',
      );

      throw new FailedRequestError(error.message, 'MailingService.sendVerifyEmailMail', error);
    }
  }

  async sendTwoFactorAuthenticationCodeMail(userEmail: string, code: string): Promise<[ClientResponse, {}]> {
    const mailingDomain = this.configService.get<string>(ENV.MAILING_DOMAIN);
    if (!mailingDomain) throw Error(ErrorMessages.MAILING_DOMAIN_NOT_SET);

    const template = await this.getTemplate(
      {
        date: new Date().toLocaleDateString(),
        code,
      },
      path.join(__dirname, 'templates/2fa-email.html'),
    );
    try {
      return await sendgrid.send({
        from: {
          name: 'Moneytree',
          email: mailingDomain,
        },
        to: userEmail,
        subject: 'Two factor authentication required',
        html: template.html,
      });
    } catch (error) {
      Logger.error(
        {
          message: error.message,
          data: error.response?.body,
        },
        'MailingService.sendTwoFactorAuthenticationCodeMail',
      );

      throw new FailedRequestError(error.message, 'MailingService.sendTwoFactorAuthenticationCodeMail', error);
    }
  }

  private async getTemplate(
    data: Record<string, string>,
    path: string,
  ): Promise<{
    html: string;
    text: string;
  }> {
    let template = await this.readHTMLFile(path);

    Object.entries(data).forEach(([key, value]) => {
      template = template.replace(this.gre(`{{${key}}}`), value);
    });

    const text = htmlToText(template);
    return { html: template, text };
  }

  private async readHTMLFile(filePath: string, options?: Options): Promise<string> {
    const template = readFileSync(filePath, 'utf8');
    return this.getMinifiedTemplate(template, options);
  }

  private async getMinifiedTemplate(template: string, options: Options = {}): Promise<string> {
    return minify(template, { ...MINIFYOPTIONS, ...options });
  }

  gre(text: string): RegExp {
    return new RegExp(text, 'g');
  }
}
