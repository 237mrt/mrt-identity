export interface AccessTokenPayload {
  /**
   * Tokenın ait olduğu kullanıcının kimliği.
   */
  userId: string;

  /**
   * Tokenın bağlı olduğu session kimliği.
   */
  sessionId: string;

  /**
   * Tokenın oluşturulduğu zaman.
   */
  issuedAt: Date;

  /**
   * Tokenın geçerliliğinin sona ereceği zaman.
   */
  expiresAt: Date;
}

export interface CreateAccessTokenInput extends AccessTokenPayload {}

export interface VerifyAccessTokenInput {
  token: string;
}

export type AccessTokenVerificationFailureReason = "invalid" | "expired";

export interface ValidAccessTokenVerification {
  valid: true;
  payload: AccessTokenPayload;
}

export interface InvalidAccessTokenVerification {
  valid: false;
  reason: AccessTokenVerificationFailureReason;
}

export type AccessTokenVerificationResult =
  | ValidAccessTokenVerification
  | InvalidAccessTokenVerification;

export interface AccessTokenProvider {
  /**
   * Kullanıcı ve session bilgilerini taşıyan
   * yeni bir access token oluşturur.
   */
  create(input: CreateAccessTokenInput): Promise<string>;

  /**
   * Access tokenın imzasını, yapısını ve
   * geçerlilik süresini doğrular.
   */
  verify(input: VerifyAccessTokenInput): Promise<AccessTokenVerificationResult>;
}
