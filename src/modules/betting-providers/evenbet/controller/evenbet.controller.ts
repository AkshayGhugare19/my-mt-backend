import {
  Controller,
  Get,
  Headers,
  Post,
  Query,
  RawBodyRequest,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { EvenBetService } from '../service/evenbet.service';
import { Public } from '@common/decorators/public-route.decorator';
import { EvenBetEventSchema, EvenBetResultDto } from '../dto/event.dto';
import { EvenBetSessionDto } from '../dto/session.dto';
import { EvenBetError } from '../error';
import { SkipResponseFormatting } from '@common/decorators/skip-response-formatting.decorator';
import { JwtPayload } from '@modules/authentication/types';
import { UserContext } from '@common/decorators/user-context.decorator';
import { jsonSafeParse } from '@utils/json-safe-parse';
import { Roles } from '@modules/role/enum/role.enum';
import { ForRoles } from '@common/decorators/for-roles.decorator';
import { PagePaginationQueryDto } from '@common/query/page-pagination.query';
import { PagePaginationResponse } from '@common/types';
import { TransactionsDto } from '../dto/transaction.dto';
import { decimalToNumber } from '@utils/decimal-do-number';
import { EvenbetLogoutResponse } from '../types';

@Controller('evenbet')
export class EvenBetController {
  constructor(private readonly evenBetService: EvenBetService) {}

  @Post('create-session')
  async createSession(
    @UserContext() { sub }: JwtPayload,
  ): Promise<EvenBetSessionDto> {
    const session = await this.evenBetService.createSession(sub);
    return new EvenBetSessionDto(session);
  }

  @Post('logout')
  async logout(
    @UserContext() { sub }: JwtPayload,
  ): Promise<EvenbetLogoutResponse> {
    return await this.evenBetService.logout(sub);
  }

  @Post('event')
  @Public()
  @SkipResponseFormatting()
  async handleEvent(
    @Headers('sign') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<EvenBetResultDto> {
    const rawEventBuffer = req.rawBody;
    if (
      !rawEventBuffer ||
      !this.evenBetService.verifyEventSignature(
        rawEventBuffer.toString(),
        signature,
      )
    ) {
      throw new EvenBetError('INVALID_SIGNATURE');
    }

    const parsedEvent = EvenBetEventSchema.safeParse(
      jsonSafeParse(rawEventBuffer.toString()),
    );
    if (!parsedEvent.success) {
      throw new EvenBetError('INVALID_REQUEST_PARAMS');
    }
    const event = parsedEvent.data;

    if (event.method === 'GetBalance') {
      const balance = await this.evenBetService.getBalanceAsUsdt(event.userId);

      return new EvenBetResultDto({
        balance: balance * 100,
        errorCode: 0,
      });
    }

    if (event.method === 'GetCash') {
      const amount = event.amount / 100; // amount is in cents

      const newBalance = await this.evenBetService.debitUsdt(
        event.userId,
        event.transactionId,
        amount,
      );

      return new EvenBetResultDto({
        balance: newBalance * 100,
        errorCode: 0,
      });
    }

    if (event.method === 'ReturnCash') {
      const amount = event.amount / 100; // amount is in cents

      const newBalance = await this.evenBetService.creditUsdt(
        event.userId,
        event.transactionId,
        amount,
      );

      return new EvenBetResultDto({
        balance: newBalance * 100,
        errorCode: 0,
      });
    }

    if (event.method === 'Rollback') {
      const amount = event.amount / 100; // amount is in cents

      const newBalance = await this.evenBetService.rollbackUsdt(
        event.userId,
        event.transactionId,
        event.referenceTransactionId,
        amount,
      );

      return new EvenBetResultDto({
        balance: newBalance * 100,
        errorCode: 0,
      });
    }

    throw new EvenBetError('INVALID_REQUEST_PARAMS');
  }

  @Get('/users/transactions')
  @ForRoles([Roles.USER, Roles.VIP_USER])
  async listUserProgress(
    @UserContext('sub') userId: string,
    @Query() paginationQuery: PagePaginationQueryDto,
  ): Promise<PagePaginationResponse<TransactionsDto>> {
    const data = await this.evenBetService.getMyInfo(paginationQuery, userId);
    return {
      data: data.data.map((transaction) =>
        TransactionsDto.from({
          ...transaction,
          amount: decimalToNumber(transaction.amount),
        }),
      ),
      limit: data.limit,
      page: data.page,
      total: data.total,
    };
  }
}
