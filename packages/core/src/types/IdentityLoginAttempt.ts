export type IdentityLoginAttemptScope = "identifier" | "identifier-ip";

export interface IdentityLoginAttempt {
  /**
   * E-posta, kullanıcı adı veya IP adresinin
   * doğrudan saklanmadığı benzersiz hash anahtarı.
   */
  key: string;

  /**
   * Kaydın yalnızca kullanıcı kimliğine mi,
   * yoksa kullanıcı + IP kombinasyonuna mı ait olduğunu belirtir.
   */
  scope: IdentityLoginAttemptScope;

  failedAttempts: number;

  firstFailedAt: Date;
  lastFailedAt: Date;

  /**
   * Geçici engelleme uygulanmadıysa null olur.
   */
  lockedUntil: Date | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface RecordIdentityLoginFailureInput {
  key: string;
  scope: IdentityLoginAttemptScope;

  /**
   * Bu başarısız denemenin gerçekleştiği zaman.
   */
  occurredAt: Date;

  /**
   * Kaç başarısız denemeden sonra kilit uygulanacağı.
   */
  maxAttempts: number;

  /**
   * Başarısız girişlerin sayılacağı zaman aralığı.
   */
  attemptWindowMs: number;

  /**
   * Kilidin ne kadar süreceği.
   */
  lockDurationMs: number;
}
