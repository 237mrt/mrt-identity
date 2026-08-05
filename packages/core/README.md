# @mrt-identity/core

Database ve web framework bağımsız, adapter tabanlı kimlik doğrulama, session yönetimi ve giriş güvenliği çekirdeği.

[![npm version](https://img.shields.io/npm/v/@mrt-identity/core.svg?label=npm)](https://www.npmjs.com/package/@mrt-identity/core)
[![npm alpha](https://img.shields.io/npm/v/@mrt-identity/core/alpha.svg?label=alpha)](https://www.npmjs.com/package/@mrt-identity/core)
[![license](https://img.shields.io/npm/l/@mrt-identity/core.svg)](../../LICENSE)

> [!WARNING]
> `@mrt-identity/core` şu anda alpha aşamasındadır. API yapısı sonraki alpha sürümlerinde değişebilir. Production kullanımı henüz önerilmez.

## İçindekiler

- [@mrt-identity/core](#mrt-identitycore)
  - [İçindekiler](#i̇çindekiler)
  - [Özellikler](#özellikler)
  - [Kurulum](#kurulum)
  - [Gerekli paketler](#gerekli-paketler)
  - [Hızlı başlangıç](#hızlı-başlangıç)
  - [Kullanıcı kaydı](#kullanıcı-kaydı)
    - [Kullanıcı adı olmadan kayıt](#kullanıcı-adı-olmadan-kayıt)
  - [Kullanıcı girişi](#kullanıcı-girişi)
  - [Refresh token yenileme](#refresh-token-yenileme)
  - [Tek sessiondan çıkış](#tek-sessiondan-çıkış)
  - [Tüm sessionlardan çıkış](#tüm-sessionlardan-çıkış)
  - [Sessionları listeleme](#sessionları-listeleme)
  - [Access token desteği](#access-token-desteği)
    - [Access token doğrulama](#access-token-doğrulama)
    - [Özel access-token provider](#özel-access-token-provider)
  - [Event sistemi](#event-sistemi)
  - [Login koruması](#login-koruması)
  - [Adapter mimarisi](#adapter-mimarisi)
  - [Hata yönetimi](#hata-yönetimi)
  - [Güvenlik notları](#güvenlik-notları)
  - [Alpha sürümünün sınırları](#alpha-sürümünün-sınırları)
  - [Repository](#repository)
  - [Lisans](#lisans)

## Özellikler

- Kullanıcı kaydı
- E-posta veya kullanıcı adıyla giriş
- E-posta normalizasyonu ve doğrulaması
- Kullanıcı adı doğrulaması
- Yapılandırılabilir parola politikası
- Değiştirilebilir parola hash sağlayıcısı
- Adapter tabanlı veri erişimi
- Session oluşturma ve yönetme
- Güvenli refresh token akışı
- Refresh token rotation
- Tek sessiondan çıkış
- Tüm sessionlardan çıkış
- Kullanıcının sessionlarını listeleme
- Başarısız giriş denemesi takibi
- Geçici brute-force engellemesi
- IP bazlı giriş koruması
- Typed event sistemi
- Opsiyonel access-token sağlayıcısı
- Access token, session ve kullanıcı doğrulaması
- Framework bağımsız TypeScript API
- PostgreSQL, MySQL, MongoDB ve özel adapter geliştirmeye uygun sözleşmeler

## Kurulum

Alpha sürümünü pnpm ile kurmak için:

```bash
pnpm add @mrt-identity/core@alpha
```

npm kullanıyorsanız:

```bash
npm install @mrt-identity/core@alpha
```

Yarn kullanıyorsanız:

```bash
yarn add @mrt-identity/core@alpha
```

## Gerekli paketler

`@mrt-identity/core` tek başına bir veritabanı veya parola hash algoritması içermez.

Çalışan temel bir yapı için aşağıdaki paketlerden yararlanabilirsiniz:

```bash
pnpm add @mrt-identity/core@alpha
pnpm add @mrt-identity/adapter-memory@alpha
pnpm add @mrt-identity/password-argon2@alpha
pnpm add @mrt-identity/token-opaque@alpha
```

Paketlerin görevleri:

| Paket | Görev |
|---|---|
| `@mrt-identity/core` | Kimlik doğrulama ve session çekirdeği |
| `@mrt-identity/adapter-memory` | Bellek tabanlı geliştirme adapterı |
| `@mrt-identity/password-argon2` | Argon2id parola hash sağlayıcısı |
| `@mrt-identity/token-opaque` | Güvenli opaque refresh token sağlayıcısı |
| `@mrt-identity/adapter-testkit` | Özel adapterlar için ortak sözleşme testleri |

## Hızlı başlangıç

```typescript
import {
  MRTIdentityClient,
} from "@mrt-identity/core";

import {
  MemoryAdapter,
} from "@mrt-identity/adapter-memory";

import {
  Argon2PasswordHasher,
} from "@mrt-identity/password-argon2";

import {
  OpaqueTokenProvider,
} from "@mrt-identity/token-opaque";

const identity =
  new MRTIdentityClient({
    applicationName:
      "Example Application",

    adapter:
      new MemoryAdapter(),

    passwordHasher:
      new Argon2PasswordHasher(),

    tokenProvider:
      new OpaqueTokenProvider(),

    sessionDurationMs:
      30 * 24 * 60 * 60 * 1000,

    loginProtection: {
      enabled: true,
      maxAttempts: 5,
      attemptWindowMs:
        15 * 60 * 1000,
      lockDurationMs:
        15 * 60 * 1000,
      trackByIp: true,
    },
  });

await identity.start();
```

Client başlatılmadan auth metotları kullanılmamalıdır:

```typescript
await identity.start();
```

## Kullanıcı kaydı

```typescript
const result =
  await identity.auth.register({
    email:
      "mert@example.com",

    username:
      "237mrt",

    password:
      "GucluParola123!",
  });

console.log(result.user);
```

Örnek sonuç:

```typescript
{
  id: "user-id",
  email: "mert@example.com",
  username: "237mrt",
  emailVerifiedAt: null,
  status: "active",
  createdAt: new Date(),
  updatedAt: new Date()
}
```

Public kullanıcı sonucunda şu alanlar bulunmaz:

```text
password
passwordHash
```

### Kullanıcı adı olmadan kayıt

Kullanıcı adı opsiyoneldir:

```typescript
const result =
  await identity.auth.register({
    email:
      "mert@example.com",

    password:
      "GucluParola123!",
  });
```

## Kullanıcı girişi

Kullanıcı e-posta adresiyle giriş yapabilir:

```typescript
const result =
  await identity.auth.login({
    identifier:
      "mert@example.com",

    password:
      "GucluParola123!",

    context: {
      ipAddress:
        "127.0.0.1",

      userAgent:
        "Example Application",
    },
  });
```

Kullanıcı adıyla da giriş yapılabilir:

```typescript
const result =
  await identity.auth.login({
    identifier:
      "237mrt",

    password:
      "GucluParola123!",
  });
```

Başarılı login sonucu:

```typescript
console.log(result.user);
console.log(result.session);
console.log(result.refreshToken);
console.log(result.passwordRehashed);
```

Örnek sonuç:

```typescript
{
  user: {
    id: "user-id",
    email: "mert@example.com",
    username: "237mrt",
    status: "active"
  },

  session: {
    id: "session-id",
    userId: "user-id",
    ipAddress: "127.0.0.1",
    userAgent: "Example Application",
    expiresAt: new Date(),
    revokedAt: null
  },

  refreshToken:
    "plain-refresh-token",

  passwordRehashed:
    false
}
```

Session adapterı veya token sağlayıcısı yapılandırılmamışsa login işlemi kullanıcı doğrulaması yapabilir ancak session ve refresh token üretmeyebilir.

## Refresh token yenileme

Login sırasında döndürülen refresh token yeni token almak için kullanılabilir:

```typescript
const refreshResult =
  await identity.auth.refresh({
    refreshToken,

    context: {
      ipAddress:
        "127.0.0.1",

      userAgent:
        "Example Application",
    },
  });

console.log(
  refreshResult.refreshToken,
);
```

Refresh işleminden sonra:

- Yeni refresh token oluşturulur.
- Session kaydındaki token hash değeri güncellenir.
- Eski refresh token geçersiz hâle gelir.
- Sessionın son kullanım zamanı güncellenir.

Eski token tekrar kullanılmamalıdır:

```typescript
await identity.auth.refresh({
  refreshToken:
    oldRefreshToken,
});
```

Bu işlem `INVALID_REFRESH_TOKEN` hatası üretir.

## Tek sessiondan çıkış

Belirli bir refresh tokena bağlı sessionı kapatmak için:

```typescript
const result =
  await identity.auth.logout({
    refreshToken,
  });

console.log(result.revoked);
```

İlk logout işleminde:

```typescript
{
  revoked: true
}
```

Aynı token tekrar gönderildiğinde:

```typescript
{
  revoked: false
}
```

dönebilir.

Logout işleminin tekrar çalıştırılabilir olması, istemci tarafındaki çıkış akışlarının daha güvenli yönetilmesini sağlar.

## Tüm sessionlardan çıkış

Bir kullanıcının bütün aktif sessionlarını kapatmak için:

```typescript
const result =
  await identity.auth.logoutAll({
    userId:
      "user-id",
  });

console.log(
  result.revokedCount,
);
```

Örnek sonuç:

```typescript
{
  revokedCount: 3
}
```

`userId` değeri doğrudan güvenilmeyen istemci verisinden alınmamalıdır. Gerçek uygulamada doğrulanmış session veya access token üzerinden elde edilmelidir.

## Sessionları listeleme

Kullanıcının aktif sessionlarını listelemek için:

```typescript
const result =
  await identity.auth.listSessions({
    userId:
      "user-id",
  });

console.log(result.sessions);
```

Varsayılan olarak:

- İptal edilmiş sessionlar
- Süresi dolmuş sessionlar

sonuçlara eklenmez.

İptal edilmiş sessionları da listelemek için:

```typescript
const result =
  await identity.auth.listSessions({
    userId:
      "user-id",

    includeRevoked:
      true,
  });
```

Süresi dolmuş sessionları da listelemek için:

```typescript
const result =
  await identity.auth.listSessions({
    userId:
      "user-id",

    includeExpired:
      true,
  });
```

Bütün sessionları listelemek için:

```typescript
const result =
  await identity.auth.listSessions({
    userId:
      "user-id",

    includeRevoked:
      true,

    includeExpired:
      true,
  });
```

Public session sonuçlarında şu alan bulunmaz:

```text
refreshTokenHash
```

## Access token desteği

Core paketi sağlayıcıdan bağımsız bir access-token sözleşmesi sunar.

Access-token sistemi opsiyoneldir:

```typescript
const identity =
  new MRTIdentityClient({
    applicationName:
      "Example Application",

    adapter,
    passwordHasher,
    tokenProvider,
    accessTokenProvider,

    accessTokenDurationMs:
      15 * 60 * 1000,
  });
```

Varsayılan access-token süresi:

```text
15 dakika
```

Access-token provider yapılandırılmışsa login sonucunda şu alanlar dönebilir:

```typescript
const result =
  await identity.auth.login({
    identifier:
      "mert@example.com",

    password:
      "GucluParola123!",
  });

console.log(
  result.accessToken,
);

console.log(
  result.accessTokenExpiresAt,
);
```

Refresh işleminde de yeni bir access token üretilebilir:

```typescript
const result =
  await identity.auth.refresh({
    refreshToken,
  });

console.log(
  result.accessToken,
);
```

### Access token doğrulama

```typescript
const authentication =
  await identity.auth.authenticate({
    accessToken,
  });

console.log(
  authentication.user,
);

console.log(
  authentication.session,
);

console.log(
  authentication
    .accessTokenExpiresAt,
);
```

`authenticate()` metodu:

- Access tokenın yapısını doğrular.
- Tokenın süresini kontrol eder.
- Tokenın bağlı olduğu sessionı bulur.
- Sessionın iptal edilip edilmediğini kontrol eder.
- Sessionın süresini kontrol eder.
- Token kullanıcısıyla session kullanıcısını karşılaştırır.
- Kullanıcının mevcut ve aktif olup olmadığını kontrol eder.
- Public kullanıcı ve public session sonucunu döndürür.

### Özel access-token provider

Hazır JWT sağlayıcısı ilk alpha sürümüne dahil değildir.

Kendi sağlayıcınızı geliştirebilirsiniz:

```typescript
import type {
  AccessTokenProvider,
} from "@mrt-identity/core";

const accessTokenProvider:
  AccessTokenProvider = {
    async create(input) {
      const {
        userId,
        sessionId,
        issuedAt,
        expiresAt,
      } = input;

      return createCustomToken({
        userId,
        sessionId,
        issuedAt,
        expiresAt,
      });
    },

    async verify(input) {
      const payload =
        await verifyCustomToken(
          input.token,
        );

      if (!payload) {
        return {
          valid: false,
          reason: "invalid",
        };
      }

      if (
        payload.expiresAt.getTime() <=
        Date.now()
      ) {
        return {
          valid: false,
          reason: "expired",
        };
      }

      return {
        valid: true,
        payload,
      };
    },
  };
```

## Event sistemi

Client üzerinden typed eventler dinlenebilir:

```typescript
identity.on(
  "userRegistered",
  event => {
    console.log(
      "Yeni kullanıcı:",
      event.user.id,
    );
  },
);
```

Login başarısını dinlemek için:

```typescript
identity.on(
  "loginSucceeded",
  event => {
    console.log(
      "Giriş başarılı:",
      event.user.id,
    );
  },
);
```

Başarısız girişleri dinlemek için:

```typescript
identity.on(
  "loginFailed",
  event => {
    console.log(
      "Başarısız giriş:",
      event.identifier,
    );
  },
);
```

Session oluşturma:

```typescript
identity.on(
  "sessionCreated",
  event => {
    console.log(
      "Session oluşturuldu:",
      event.session.id,
    );
  },
);
```

Refresh işlemi:

```typescript
identity.on(
  "sessionRefreshed",
  event => {
    console.log(
      "Session yenilendi:",
      event.session.id,
    );
  },
);
```

Session iptali:

```typescript
identity.on(
  "sessionRevoked",
  event => {
    console.log(
      "Session iptal edildi:",
      event.sessionId,
    );
  },
);
```

Bütün sessionların iptal edilmesi:

```typescript
identity.on(
  "sessionsRevoked",
  event => {
    console.log(
      "İptal edilen session sayısı:",
      event.revokedCount,
    );
  },
);
```

Tek seferlik listener:

```typescript
identity.once(
  "userRegistered",
  event => {
    console.log(event.user);
  },
);
```

Listener kaldırma:

```typescript
const listener = (
  event:
    unknown,
) => {
  console.log(event);
};

identity.on(
  "loginSucceeded",
  listener,
);

identity.off(
  "loginSucceeded",
  listener,
);
```

Bütün listenerları kaldırma:

```typescript
identity.removeAllListeners();
```

Event listener içerisinde oluşan bir hata ana auth işlemini bozmaz.

## Login koruması

Başarısız giriş denemelerini takip etmek için adapterın login-attempt desteği bulunmalıdır.

Örnek yapılandırma:

```typescript
const identity =
  new MRTIdentityClient({
    applicationName:
      "Example Application",

    adapter,
    passwordHasher,
    tokenProvider,

    loginProtection: {
      enabled: true,

      maxAttempts:
        5,

      attemptWindowMs:
        15 * 60 * 1000,

      lockDurationMs:
        15 * 60 * 1000,

      trackByIp:
        true,
    },
  });
```

Bu yapılandırma:

```text
15 dakika içerisinde 5 başarısız giriş
→ 15 dakika geçici engelleme
```

uygular.

Başarılı giriş sonrasında ilgili başarısız giriş sayaçları temizlenir.

Kullanıcı bilgisi sızdırmamak için hatalı e-posta, kullanıcı adı veya parola durumlarında genel olarak:

```text
INVALID_CREDENTIALS
```

hatası kullanılır.

## Adapter mimarisi

`@mrt-identity/core` kendi veritabanını içermez.

Adapterlar aşağıdaki veri alanlarını sağlayabilir:

```text
users
sessions
loginAttempts
```

Örnek client yapılandırması:

```typescript
const identity =
  new MRTIdentityClient({
    applicationName:
      "Example Application",

    adapter:
      customAdapter,

    passwordHasher,
    tokenProvider,
  });
```

Özel adapterlar şu veritabanları için geliştirilebilir:

- PostgreSQL
- MySQL
- MariaDB
- MongoDB
- SQLite
- Redis
- Özel HTTP servisleri
- Kuruma özel veri katmanları

Adapter geliştiren paketler, ortak davranışları doğrulamak için:

```text
@mrt-identity/adapter-testkit
```

paketini kullanabilir.

## Hata yönetimi

Core işlemleri `MRTIdentityError` üretebilir:

```typescript
import {
  MRTIdentityError,
} from "@mrt-identity/core";

try {
  await identity.auth.login({
    identifier:
      "mert@example.com",

    password:
      "wrong-password",
  });
} catch (error) {
  if (
    error instanceof
      MRTIdentityError
  ) {
    console.error(
      error.code,
    );
  }
}
```

Önemli hata kodlarından bazıları:

```text
CLIENT_NOT_READY
ADAPTER_NOT_CONFIGURED
PASSWORD_HASHER_NOT_CONFIGURED
INVALID_EMAIL
INVALID_USERNAME
WEAK_PASSWORD
USER_EMAIL_ALREADY_EXISTS
USER_USERNAME_ALREADY_EXISTS
INVALID_CREDENTIALS
USER_ACCOUNT_LOCKED
USER_ACCOUNT_DISABLED
LOGIN_TEMPORARILY_BLOCKED
SESSION_SUPPORT_NOT_CONFIGURED
TOKEN_PROVIDER_NOT_CONFIGURED
ACCESS_TOKEN_PROVIDER_NOT_CONFIGURED
INVALID_REFRESH_TOKEN
INVALID_ACCESS_TOKEN
ACCESS_TOKEN_EXPIRED
SESSION_EXPIRED
SESSION_REVOKED
SESSION_USER_NOT_FOUND
```

HTTP framework entegrasyonlarında bu hata kodları uygun HTTP durumlarına dönüştürülebilir.

Örnek:

```text
INVALID_CREDENTIALS
→ 401 Unauthorized

USER_ACCOUNT_DISABLED
→ 403 Forbidden

USER_EMAIL_ALREADY_EXISTS
→ 409 Conflict

LOGIN_TEMPORARILY_BLOCKED
→ 429 Too Many Requests
```

## Güvenlik notları

- Parolalar düz metin olarak saklanmamalıdır.
- Güçlü bir parola hash sağlayıcısı kullanılmalıdır.
- Refresh tokenlar yalnızca hash olarak saklanmalıdır.
- Düz metin refresh token loglara yazılmamalıdır.
- Refresh token URL query parametresinde taşınmamalıdır.
- Token ve session cevapları cache edilmemelidir.
- Kullanıcı kimliği doğrudan güvenilmeyen request alanlarından alınmamalıdır.
- Session ve access-token doğrulaması yapılmadan korumalı işlemler çalıştırılmamalıdır.
- Production ortamında MemoryAdapter kullanılmamalıdır.
- HTTPS kullanılmalıdır.
- Tarayıcı uygulamalarında refresh token için güvenli `HttpOnly` cookie tercih edilebilir.
- Cookie tabanlı auth kullanıldığında CSRF önlemleri uygulanmalıdır.
- Reverse proxy arkasında gerçek istemci IP ayarları dikkatli yapılmalıdır.
- Hassas auth hataları kullanıcı varlığını belli edecek şekilde ayrıntılandırılmamalıdır.
- Alpha sürüm production güvenlik denetiminden geçmiş kabul edilmemelidir.

## Alpha sürümünün sınırları

İlk alpha sürümünde:

- Hazır PostgreSQL adapterı bulunmamaktadır.
- Hazır MySQL adapterı bulunmamaktadır.
- Hazır MongoDB adapterı bulunmamaktadır.
- Hazır JWT access-token sağlayıcısı bulunmamaktadır.
- MemoryAdapter verileri kalıcı değildir.
- API isimleri veya tipleri sonraki alpha sürümlerinde değişebilir.
- Production güvenlik incelemesi tamamlanmamıştır.
- E-posta doğrulama sistemi bulunmamaktadır.
- Parola sıfırlama sistemi bulunmamaktadır.
- İki faktörlü doğrulama bulunmamaktadır.
- OAuth sağlayıcıları bulunmamaktadır.
- Rol ve izin sistemi bulunmamaktadır.

Bu sürümün amacı:

- Core mimarinin denenmesi
- Adapter sözleşmelerinin test edilmesi
- Geliştirici geri bildirimi toplanması
- Sonraki alpha ve beta sürümlerinin hazırlanmasıdır

## Repository

Kaynak kod:

```text
https://github.com/237mrt/mrt-identity
```

Hata bildirimi:

```text
https://github.com/237mrt/mrt-identity/issues
```

## Lisans

`@mrt-identity/core`, MIT lisansı altında yayımlanır.

Ayrıntılar için repository kökündeki `LICENSE` dosyasına bakabilirsiniz.