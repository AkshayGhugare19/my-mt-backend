export class BetNotSettledError extends Error {
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
      `Bet Not settled for betId: ${betId}, thirdPartyIdentifier: ${thirdPartyIdentifier}, provider: ${provider}`,
    );
  }
}
