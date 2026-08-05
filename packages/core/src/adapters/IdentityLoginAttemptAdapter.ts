import type {
  IdentityLoginAttempt,
  RecordIdentityLoginFailureInput,
} from "../types/IdentityLoginAttempt.js";

export interface IdentityLoginAttemptAdapter {
  /**
   * Belirtilen güvenlik anahtarına ait
   * başarısız giriş kaydını getirir.
   */
  findByKey(key: string): Promise<IdentityLoginAttempt | null>;

  /**
   * Başarısız giriş sayısını atomik biçimde artırır.
   *
   * Zaman aralığı dolmuşsa sayaç yeniden başlatılmalıdır.
   * Maksimum deneme sayısına ulaşılırsa lockedUntil
   * alanı ayarlanmalıdır.
   */
  recordFailure(
    input: RecordIdentityLoginFailureInput,
  ): Promise<IdentityLoginAttempt>;

  /**
   * Başarılı giriş sonrasında ilgili sayacı temizler.
   */
  clear(key: string): Promise<boolean>;

  /**
   * Artık kullanılmayan eski kayıtları temizler.
   */
  deleteStale(before: Date): Promise<number>;
}
