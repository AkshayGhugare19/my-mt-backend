import { Logger } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';

export type GenericGGRComputationParams = {
  totalBets: Decimal;
  winningsPaidOut: Decimal;
};

export function genericGgrComputation(
  params: GenericGGRComputationParams[],
): Decimal {
  const totalBets = Decimal.sum(...params.map((param) => param.totalBets));
  const winningPaidOut = Decimal.sum(
    ...params.map((param) => param.winningsPaidOut),
  );

  if (!totalBets || !winningPaidOut) {
    Logger.error(
      {
        message: 'Invalid params for GGR computation',
        params,
        totalBets,
        winningPaidOut,
      },
      'genericGgrComputation',
    );
    return new Decimal(0);
  }
  return totalBets.sub(winningPaidOut);
}
