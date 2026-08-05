import type { PublicIdentityUser } from "../types/PublicIdentityUser.js";

export interface LoginInput {
  /**
   * Kullanıcının e-posta adresi veya kullanıcı adı.
   */
  identifier: string;

  /**
   * Kullanıcının düz metin parolası.
   */
  password: string;
}

export interface LoginResult {
  user: PublicIdentityUser;

  /**
   * Eski parola hash ayarları giriş sırasında
   * güncellendiyse true olur.
   */
  passwordRehashed: boolean;
}
