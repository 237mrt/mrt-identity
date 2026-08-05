# @mrt-identity/adapter-memory

`mrt-identity` için bellek tabanlı kullanıcı, session ve başarısız giriş denemesi adapterı.

[![npm version](https://img.shields.io/npm/v/@mrt-identity/adapter-memory.svg?label=npm)](https://www.npmjs.com/package/@mrt-identity/adapter-memory)
[![npm alpha](https://img.shields.io/npm/v/@mrt-identity/adapter-memory/alpha.svg?label=alpha)](https://www.npmjs.com/package/@mrt-identity/adapter-memory)
[![license](https://img.shields.io/npm/l/@mrt-identity/adapter-memory.svg)](../../LICENSE)

> [!WARNING]
> MemoryAdapter bütün kayıtları RAM içerisinde saklar. Uygulama kapandığında kullanıcılar, sessionlar ve giriş denemeleri silinir. Production kullanımı için tasarlanmamıştır.

## Özellikler

- Kullanıcı oluşturma
- ID ile kullanıcı bulma
- E-posta ile kullanıcı bulma
- Kullanıcı adı ile kullanıcı bulma
- Kullanıcı güncelleme
- Kullanıcı silme
- Duplicate e-posta kontrolü
- Duplicate kullanıcı adı kontrolü
- Session oluşturma
- Session güncelleme
- Session iptal etme
- Kullanıcının bütün sessionlarını iptal etme
- Refresh token hash ile session bulma
- Süresi dolmuş sessionları temizleme
- Başarısız giriş denemelerini kaydetme
- Başarılı giriş sonrası giriş denemelerini temizleme
- Adapter sözleşme testleriyle doğrulanmış davranışlar

## Kurulum

pnpm:

```bash
pnpm add @mrt-identity/adapter-memory@alpha
```

npm:

```bash
npm install @mrt-identity/adapter-memory@alpha
```

Yarn:

```bash
yarn add @mrt-identity/adapter-memory@alpha
```

Ayrıca core paketi gerekir:

```bash
pnpm add @mrt-identity/core@alpha
```

## Temel kullanım

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

const adapter =
  new MemoryAdapter();

const identity =
  new MRTIdentityClient({
    applicationName:
      "Example Application",

    adapter,

    passwordHasher:
      new Argon2PasswordHasher(),

    tokenProvider:
      new OpaqueTokenProvider(),
  });

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

Kullanıcı MemoryAdapter içerisinde saklanır.

Uygulama çalıştığı sürece kullanıcıyla giriş yapılabilir:

```typescript
const login =
  await identity.auth.login({
    identifier:
      "mert@example.com",

    password:
      "GucluParola123!",
  });
```

## Session desteği

MemoryAdapter session sözleşmesini destekler.

Token sağlayıcısı yapılandırıldığında login işlemi session ve refresh token oluşturabilir:

```typescript
const login =
  await identity.auth.login({
    identifier:
      "mert@example.com",

    password:
      "GucluParola123!",
  });

console.log(login.session);
console.log(login.refreshToken);
```

Sessionları listelemek için:

```typescript
const result =
  await identity.auth.listSessions({
    userId:
      login.user.id,
  });

console.log(result.sessions);
```

## Login koruması

MemoryAdapter başarısız giriş denemelerinin takip edilmesini destekler.

```typescript
const identity =
  new MRTIdentityClient({
    applicationName:
      "Example Application",

    adapter:
      new MemoryAdapter(),

    passwordHasher,
    tokenProvider,

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
```

Bu örnekte 15 dakika içerisinde beş başarısız giriş yapılırsa giriş işlemi geçici olarak engellenir.

## Verilerin yaşam süresi

MemoryAdapter bütün verileri uygulama belleğinde saklar.

```text
Uygulama çalışır
→ Veriler kullanılabilir

Uygulama kapanır
→ Bütün veriler silinir

Uygulama yeniden başlar
→ Adapter boş olarak başlar
```

Bu nedenle aşağıdaki alanlar için uygundur:

- Yerel geliştirme
- Otomatik testler
- Örnek uygulamalar
- Eğitim projeleri
- Adapter prototipleme
- Geçici demo uygulamaları

## Production kullanımı

MemoryAdapter production ortamında kullanılmamalıdır.

Production uygulamalarında kalıcı veri sağlayan bir adapter tercih edilmelidir:

- PostgreSQL
- MySQL
- MariaDB
- MongoDB
- SQLite
- Kuruma özel veri katmanı

## Güvenlik notları

- MemoryAdapter düz metin parola saklamaz.
- Parola hashleme işlemini yapılandırılan `PasswordHasher` gerçekleştirir.
- Refresh tokenların yalnızca hash değeri saklanır.
- Public session sonuçlarında `refreshTokenHash` bulunmaz.
- Uygulama belleğine erişebilen bir saldırgan adapter içeriğine de erişebilir.
- Hassas production verileri RAM tabanlı geliştirme adapterında tutulmamalıdır.

## Adapter sözleşmeleri

MemoryAdapter şu sözleşmeleri uygular:

```text
IdentityUserAdapter
IdentitySessionAdapter
IdentityLoginAttemptAdapter
```

Paket davranışları `@mrt-identity/adapter-testkit` ile doğrulanır.

## Alpha sürümü

Bu paket alpha aşamasındadır.

Sonraki alpha sürümlerinde:

- Metot imzaları
- Adapter sözleşmeleri
- Hata davranışları
- Public tipler

değişebilir.

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

`@mrt-identity/adapter-memory`, MIT lisansı altında yayımlanır.