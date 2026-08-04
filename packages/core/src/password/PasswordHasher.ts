export interface PasswordHasher {
  /**
   * Kullanılan parola hash sağlayıcısının adı.
   *
   * Örnek:
   * argon2id
   * scrypt
   * bcrypt
   */
  readonly name: string;

  /**
   * Düz metin parolayı güvenli bir hash değerine dönüştürür.
   */
  hash(password: string): Promise<string>;

  /**
   * Düz metin parolanın kayıtlı hash ile eşleşip
   * eşleşmediğini kontrol eder.
   */
  verify(password: string, passwordHash: string): Promise<boolean>;

  /**
   * Kayıtlı hash değerinin güncel ayarlarla yeniden
   * oluşturulması gerekip gerekmediğini kontrol eder.
   */
  needsRehash?(passwordHash: string): boolean | Promise<boolean>;
}
