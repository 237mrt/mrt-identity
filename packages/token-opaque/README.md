# @mrt-identity/token-opaque

`mrt-identity` session ve refresh-token akışları için güvenli opaque token sağlayıcısı.

[![npm version](https://img.shields.io/npm/v/@mrt-identity/token-opaque.svg?label=npm)](https://www.npmjs.com/package/@mrt-identity/token-opaque)
[![npm alpha](https://img.shields.io/npm/v/@mrt-identity/token-opaque/alpha.svg?label=alpha)](https://www.npmjs.com/package/@mrt-identity/token-opaque)
[![license](https://img.shields.io/npm/l/@mrt-identity/token-opaque.svg)](../../LICENSE)

> [!WARNING]
> Bu paket alpha aşamasındadır. Düz metin tokenlar gizli bilgi olarak değerlendirilmelidir ve loglara yazılmamalıdır.

## Özellikler

- Kriptografik olarak güvenli rastgele token üretimi
- SHA-256 token hashleme
- Düz metin ve hash değerini ayrı döndürme
- Timing-safe token doğrulama
- Yapılandırılabilir token byte uzunluğu
- `TokenProvider` core sözleşmesiyle uyum
- Refresh token rotation akışına uygun yapı
- Veritabanında yalnızca token hash saklanmasını destekleme

## Kurulum

pnpm:

```bash
pnpm add @mrt-identity/token-opaque@alpha
```

npm:

```bash
npm install @mrt-identity/token-opaque@alpha
```

Yarn:

```bash
yarn add @mrt-identity/token-opaque@alpha
```

Core paketi ayrıca kurulmalıdır:

```bash
pnpm add @mrt-identity/core@alpha
```

## Temel kullanım

```typescript
import {
  OpaqueTokenProvider,
} from "@mrt-identity/token-opaque";

const tokenProvider =
  new OpaqueTokenProvider();
```

Client yapılandırmasına eklemek için:

```typescript
import {
  MRTIdentityClient,
} from "@mrt-identity/core";

import {
  OpaqueTokenProvider,
} from "@mrt-identity/token-opaque";

const identity =
  new MRTIdentityClient({
    applicationName:
      "Example Application",

    adapter,
    passwordHasher,

    tokenProvider:
      new OpaqueTokenProvider(),
  });

await identity.start();
```

## Token üretme

```typescript
const result =
  await tokenProvider.generate();
```

Örnek sonuç:

```typescript
{
  token:
    "istemciye-verilecek-token",

  tokenHash:
    "adapterda-saklanacak-hash",
}
```

`token` değeri yalnızca istemciye verilir.

`tokenHash` değeri adapter veya veritabanında saklanır.

## Token hashleme

Mevcut bir tokenın hash değerini oluşturmak için:

```typescript
const tokenHash =
  await tokenProvider.hash(
    plainToken,
  );
```

Aynı token her zaman aynı SHA-256 hash değerini üretir.

## Token doğrulama

```typescript
const valid =
  await tokenProvider.verify(
    plainToken,
    storedTokenHash,
  );
```

Doğru token için:

```typescript
true
```

Yanlış token için:

```typescript
false
```

döner.

Doğrulama işlemi timing-safe karşılaştırma kullanır.

## MRTIdentityClient ile refresh-token akışı

```typescript
const identity =
  new MRTIdentityClient({
    applicationName:
      "Example Application",

    adapter,
    passwordHasher,

    tokenProvider:
      new OpaqueTokenProvider(),
  });

await identity.start();
```

Başarılı login:

```typescript
const login =
  await identity.auth.login({
    identifier:
      "mert@example.com",

    password:
      "GucluParola123!",
  });

console.log(
  login.refreshToken,
);
```

Adapter içerisinde düz metin token değil, yalnızca hash değeri saklanır.

Refresh işlemi:

```typescript
const refreshed =
  await identity.auth.refresh({
    refreshToken:
      login.refreshToken!,
  });

console.log(
  refreshed.refreshToken,
);
```

Refresh token rotation nedeniyle eski token artık kullanılamaz.

Logout:

```typescript
await identity.auth.logout({
  refreshToken:
    refreshed.refreshToken,
});
```

## Opaque token nedir?

Opaque token içerisinde kullanıcı veya session bilgisi okunabilir şekilde bulunmayan rastgele bir değerdir.

Örnek:

```text
nmfcf9SV5J6N2rQ0k0lT...
```

Tokenın:

- Kullanıcı ID’si
- Session ID’si
- Yetki bilgileri
- Son kullanma zamanı

gibi bilgileri doğrudan okunamaz.

Tokenın hangi sessiona ait olduğu yalnızca sunucu tarafındaki kayıt üzerinden belirlenir.

## JWT ile farkı

Opaque token:

- Rastgele bir değerdir.
- Sunucu tarafında session kaydı gerektirir.
- İçerisindeki bilgiler istemci tarafından okunamaz.
- İptal edilmesi kolaydır.
- Hash olarak saklanabilir.

JWT:

- İmzalı claim bilgileri taşıyabilir.
- İçeriği base64 olarak okunabilir.
- Bazı kullanımlarda veritabanı sorgusu olmadan doğrulanabilir.
- Erken iptal için ek mekanizma gerektirebilir.

Bu paket esas olarak refresh token ve stateful session akışları için tasarlanmıştır.

## Özel token uzunluğu

Provider destekliyorsa token byte uzunluğu yapılandırılabilir:

```typescript
const tokenProvider =
  new OpaqueTokenProvider({
    byteLength: 48,
  });
```

Daha yüksek byte uzunluğu tokenın tahmin edilmesini zorlaştırır ancak token metnini uzatır.

Geçersiz veya çok düşük değerler provider tarafından reddedilir.

## Güvenlik modeli

Doğru kullanım:

```text
Düz metin token
→ Yalnızca istemciye gönderilir

Token hash
→ Adapter veya veritabanında saklanır
```

Yanlış kullanım:

```text
Düz metin token
→ Veritabanında saklanır
→ Loglara yazılır
→ URL parametresinde taşınır
```

## Güvenlik notları

- Düz metin tokenı loglara yazmayın.
- Tokenı URL query parametresinde taşımayın.
- Token hashini istemciye göndermeyin.
- Refresh tokenı uzun süreli hassas credential olarak değerlendirin.
- Tarayıcı uygulamalarında güvenli `HttpOnly` cookie kullanmayı değerlendirin.
- Cookie tabanlı kullanımda CSRF koruması uygulayın.
- HTTPS olmadan token taşımayın.
- Token rotation sonrasında eski tokenı silin.
- Session iptal edildiğinde ilgili tokenı reddedin.
- Tokenları kaynak kod içerisine sabitlemeyin.
- Production loglarında request body veya auth header filtrelemesi uygulayın.

## Access token değildir

Bu paket mevcut alpha sürümünde core `TokenProvider` sözleşmesini uygular ve esas olarak refresh-token/session akışı için kullanılır.

Core içerisindeki `AccessTokenProvider` farklı bir sözleşmedir.

Hazır JWT access-token sağlayıcısı bu alpha sürümünde henüz bulunmamaktadır.

## Alpha sürümü

Bu paket alpha aşamasındadır.

Sonraki alpha sürümlerinde:

- Constructor seçenekleri
- Varsayılan token uzunluğu
- Hashleme davranışları
- Public TypeScript tipleri

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

`@mrt-identity/token-opaque`, MIT lisansı altında yayımlanır.