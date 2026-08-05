export interface GeneratedToken {
  /**
   * Kullanıcıya gönderilecek düz metin token.
   */
  token: string;

  /**
   * Adaptörde saklanacak token hash değeri.
   */
  tokenHash: string;
}

export interface TokenProvider {
  readonly name: string;

  /**
   * Yeni bir düz metin token ve ona ait
   * güvenli hash değerini üretir.
   */
  generate(): Promise<GeneratedToken>;

  /**
   * Verilen token için hash oluşturur.
   */
  hash(token: string): Promise<string>;

  /**
   * Düz metin tokenin kayıtlı hash değeriyle
   * eşleşip eşleşmediğini güvenli şekilde kontrol eder.
   */
  verify(token: string, tokenHash: string): Promise<boolean>;
}
