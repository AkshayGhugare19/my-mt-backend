export class InvalidTokenError extends Error {
  public idToken: string;
  public targetVerifier: string;

  constructor(params: {
    idToken: string;
    targetVerifier: string;
    message?: string;
  }) {
    const { idToken, message } = params;
    super(message ?? 'Invalid token');
    this.name = 'InvalidTokenError';
    this.idToken = idToken;
    this.targetVerifier = params.targetVerifier;
  }
}
