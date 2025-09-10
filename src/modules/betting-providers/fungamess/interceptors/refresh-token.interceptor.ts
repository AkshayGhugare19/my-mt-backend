import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { JwtService } from '@nestjs/jwt';
import { FungamessService } from '@modules/betting-providers/fungamess/service/fungamess.service';

@Injectable()
export class FungamessRefreshTokenInterceptor implements NestInterceptor {
  constructor(
    private readonly jwtService: JwtService,
    private readonly fungamessService: FungamessService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const token = req.query.token;

    return next.handle().pipe(
      map(async (data) => {
        const decoded = this.jwtService.decode(token);
        const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (expiresIn < 900) {
          const newToken = await this.fungamessService.createSession(decoded.sub)
          return { ...data, token: newToken.token };
        }

        return { ...data };
      }),
    );
  }
}
