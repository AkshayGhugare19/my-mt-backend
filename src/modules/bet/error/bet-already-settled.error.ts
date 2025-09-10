export class BetAlreadySettledError extends Error {
  constructor({
    betId,
    provider,
    thirdPartyIdentifier,
  }: {
    betId?: string;
    thirdPartyIdentifier?: string;
    provider?: string;
  }) {
    super(
      `Bet Already settled for betId: ${betId}, thirdPartyIdentifier: ${thirdPartyIdentifier}, provider: ${provider}`,
    );
  }
}
