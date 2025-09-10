export class BetNotFoundError extends Error {
  userId?: string;
  constructor({
    betId,
    provider,
    userId,
    thirdPartyIdentifier,
  }: {
    betId?: string;
    thirdPartyIdentifier?: string;
    userId?: string;
    provider?: string;
  }) {
    super(
      `Bet not found with betId: ${betId}, thirdPartyIdentifier: ${thirdPartyIdentifier}, provider: ${provider}`,
    );
    this.userId = userId;
  }
}
