import type { ErrorRequestHandler } from "express";

import { MRTIdentityError } from "@mrt-identity/core";

import { ApiError } from "../errors/ApiError.js";

interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string;
}

const identityErrorMessages: Record<string, ErrorResponse> = {
  INVALID_REFRESH_TOKEN: {
    statusCode: 401,
    code: "INVALID_REFRESH_TOKEN",
    message: "Refresh token geçerli değil.",
  },

  SESSION_EXPIRED: {
    statusCode: 401,
    code: "SESSION_EXPIRED",
    message: "Oturumun süresi dolmuş.",
  },

  SESSION_REVOKED: {
    statusCode: 401,
    code: "SESSION_REVOKED",
    message: "Oturum daha önce kapatılmış.",
  },

  SESSION_USER_NOT_FOUND: {
    statusCode: 404,
    code: "SESSION_USER_NOT_FOUND",
    message: "Oturuma ait kullanıcı bulunamadı.",
  },

  SESSION_SUPPORT_NOT_CONFIGURED: {
    statusCode: 503,
    code: "SESSION_SUPPORT_NOT_CONFIGURED",
    message: "Oturum servisi yapılandırılmamış.",
  },

  TOKEN_PROVIDER_NOT_CONFIGURED: {
    statusCode: 503,
    code: "TOKEN_PROVIDER_NOT_CONFIGURED",
    message: "Token servisi yapılandırılmamış.",
  },

  ADAPTER_NOT_CONFIGURED: {
    statusCode: 503,
    code: "ADAPTER_NOT_CONFIGURED",
    message: "Veri adapterı yapılandırılmamış.",
  },

  INVALID_EMAIL: {
    statusCode: 400,
    code: "INVALID_EMAIL",
    message: "Geçerli bir e-posta adresi girilmelidir.",
  },

  INVALID_USERNAME: {
    statusCode: 400,
    code: "INVALID_USERNAME",
    message: "Kullanıcı adı geçerli değil.",
  },

  WEAK_PASSWORD: {
    statusCode: 400,
    code: "WEAK_PASSWORD",
    message: "Parola güvenlik şartlarını karşılamıyor.",
  },

  USER_EMAIL_ALREADY_EXISTS: {
    statusCode: 409,
    code: "USER_EMAIL_ALREADY_EXISTS",
    message: "Bu e-posta adresiyle kayıtlı bir kullanıcı bulunuyor.",
  },

  USER_USERNAME_ALREADY_EXISTS: {
    statusCode: 409,
    code: "USER_USERNAME_ALREADY_EXISTS",
    message: "Bu kullanıcı adı daha önce alınmış.",
  },

  INVALID_CREDENTIALS: {
    statusCode: 401,
    code: "INVALID_CREDENTIALS",
    message: "E-posta, kullanıcı adı veya parola hatalı.",
  },

  LOGIN_TEMPORARILY_BLOCKED: {
    statusCode: 429,
    code: "LOGIN_TEMPORARILY_BLOCKED",
    message:
      "Çok fazla başarısız giriş denemesi yapıldı. Daha sonra tekrar deneyin.",
  },

  USER_ACCOUNT_LOCKED: {
    statusCode: 403,
    code: "USER_ACCOUNT_LOCKED",
    message: "Kullanıcı hesabı kilitli.",
  },

  USER_ACCOUNT_DISABLED: {
    statusCode: 403,
    code: "USER_ACCOUNT_DISABLED",
    message: "Kullanıcı hesabı devre dışı.",
  },

  CLIENT_NOT_READY: {
    statusCode: 503,
    code: "IDENTITY_SERVICE_NOT_READY",
    message: "Kimlik doğrulama servisi hazır değil.",
  },
};

function resolveIdentityError(error: MRTIdentityError): ErrorResponse {
  return (
    identityErrorMessages[error.code] ?? {
      statusCode: 500,
      code: error.code,
      message: "Kimlik doğrulama işlemi tamamlanamadı.",
    }
  );
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _request,
  response,
  _next,
) => {
  if (error instanceof ApiError) {
    response.status(error.statusCode).json({
      success: false,

      error: {
        code: error.code,
        message: error.message,
      },
    });

    return;
  }

  if (error instanceof MRTIdentityError) {
    const resolvedError = resolveIdentityError(error);

    response.status(resolvedError.statusCode).json({
      success: false,

      error: {
        code: resolvedError.code,
        message: resolvedError.message,
      },
    });

    return;
  }

  /*
   * express.json tarafından gönderilen
   * geçersiz JSON hatası.
   */
  if (error instanceof SyntaxError) {
    response.status(400).json({
      success: false,

      error: {
        code: "INVALID_JSON",
        message: "Gönderilen JSON verisi geçerli değil.",
      },
    });

    return;
  }

  console.error("Beklenmeyen Express hatası:", error);

  response.status(500).json({
    success: false,

    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Beklenmeyen bir sunucu hatası oluştu.",
    },
  });
};
