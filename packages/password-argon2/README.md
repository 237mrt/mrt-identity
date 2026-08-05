# @mrt-identity/password-argon2

`mrt-identity` için Argon2id tabanlı parola hash sağlayıcısı.

[![npm version](https://img.shields.io/npm/v/@mrt-identity/password-argon2.svg?label=npm)](https://www.npmjs.com/package/@mrt-identity/password-argon2)
[![npm alpha](https://img.shields.io/npm/v/@mrt-identity/password-argon2/alpha.svg?label=alpha)](https://www.npmjs.com/package/@mrt-identity/password-argon2)
[![license](https://img.shields.io/npm/l/@mrt-identity/password-argon2.svg)](../../LICENSE)

> [!WARNING]
> Bu paket alpha aşamasındadır. Production ortamına geçmeden önce parola hash parametrelerini kendi güvenlik ve performans gereksinimlerinize göre değerlendirin.

## Özellikler

- Argon2id algoritması
- Güvenli parola hashleme
- Parola doğrulama
- Hash yapılandırması kontrolü
- `needsRehash()` desteği
- Yapılandırılabilir memory cost
- Yapılandırılabilir time cost
- Yapılandırılabilir parallelism
- Yapılandırılabilir hash length
- Geçersiz hash girdilerinde güvenli davranış
- `PasswordHasher` core sözleşmesiyle uyum

## Kurulum

pnpm:

```bash
pnpm add @mrt-identity/password-argon2@alpha
```

npm:

```bash
npm install @mrt-identity/password-argon2@alpha
```

Yarn:

```bash
yarn add @mrt-identity/password-argon2@alpha
```

Core paketi ayrıca kurulmalıdır:

```bash
pnpm add @mrt-identity/core@alpha
```

## Temel kullanım

```typescript
import {
  Argon2PasswordHasher,
} from "@mrt-identity/password-argon2";

const passwordHasher =
  new Argon2PasswordHasher();
```

Client yapılandırmasına eklemek için:

```typescript
import {
  MRTIdentityClient,
} from "@mrt-identity/core";

import {
  Argon2PasswordHasher,
} from "@mrt-identity/password-argon2";

const identity =
  new MRTIdentityClient({
    applicationName:
      "Example Application",

    adapter,
    tokenProvider,

    passwordHasher:
      new Argon2PasswordHasher(),
  });

await identity.start();
```

## Varsayılan yapılandırma

Varsayılan değerler:

```text
Algorithm: Argon2id
Memory cost: 19456 KiB
Time cost: 2
Parallelism: 1
Hash length: 32 byte
```

Örnek:

```typescript
const passwordHasher =
  new Argon2PasswordHasher({
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    hashLength: 32,
  });
```

## Parola hashleme

```typescript
const hash =
  await passwordHasher.hash(
    "GucluParola123!",
  );

console.log(hash);
```

Hash sonucu Argon2 formatında bir metindir:

```text
$argon2id$v=19$m=19456,t=2,p=1$...
```

Aynı parola tekrar hashlendiğinde farklı salt nedeniyle farklı hash üretilebilir. Bu normal ve güvenli bir davranıştır.

## Parola doğrulama

```typescript
const valid =
  await passwordHasher.verify(
    "GucluParola123!",
    hash,
  );

console.log(valid);
```

Doğru parola için:

```typescript
true
```

Yanlış parola için:

```typescript
false
```

döner.

## Rehash kontrolü

Mevcut hash değerinin güncel yapılandırmaya uyup uymadığını kontrol etmek için:

```typescript
const shouldRehash =
  await passwordHasher.needsRehash(
    hash,
  );
```

Örnek:

```typescript
if (shouldRehash) {
  const newHash =
    await passwordHasher.hash(
      password,
    );

  await updatePasswordHash(
    userId,
    newHash,
  );
}
```

`mrt-identity` login işlemi sırasında sağlayıcı destekliyorsa eski hash yapılandırmalarını otomatik olarak yenileyebilir.

## Özel yapılandırma

```typescript
const passwordHasher =
  new Argon2PasswordHasher({
    memoryCost: 32_768,
    timeCost: 3,
    parallelism: 1,
    hashLength: 32,
  });
```

Daha yüksek memory veya time değerleri hashleme işlemini daha maliyetli hâle getirir.

Bu, parola saldırılarına karşı korumayı artırabilir ancak sunucu kaynak kullanımını da yükseltir.

Production değerleri seçilirken:

- Sunucu donanımı
- Beklenen eş zamanlı login sayısı
- API yanıt süresi
- Bellek sınırları
- DoS riski

birlikte değerlendirilmelidir.

## MRTIdentityClient ile kullanım

```typescript
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
  });

await identity.start();

await identity.auth.register({
  email:
    "mert@example.com",

  password:
    "GucluParola123!",
});
```

Register işlemi sırasında parola Argon2id ile hashlenir. Adapter içerisine yalnızca hash değeri gönderilir.

Login sırasında:

```typescript
await identity.auth.login({
  identifier:
    "mert@example.com",

  password:
    "GucluParola123!",
});
```

parola mevcut hash ile doğrulanır.

## Güvenlik notları

- Parola hashlerini loglara yazmayın.
- Düz metin parolaları veritabanında saklamayın.
- Parolaları şifrelemek yerine hashleyin.
- Hash parametrelerini sunucu kapasitesine göre ayarlayın.
- Çok düşük memory ve time değerleri kullanmayın.
- Kullanıcının parolasını `trim()` gibi işlemlerle sessizce değiştirmeyin.
- Parola doğrulama hatalarında kullanıcı varlığını belli etmeyin.
- Hash değerlerini istemciye veya public API cevaplarına göndermeyin.
- Production ortamında yük testleri yapmadan yüksek kaynak değerleri kullanmayın.

## Native bağımlılık

Bu paket `argon2` bağımlılığını kullanır.

Kurulum sırasında işletim sistemine uygun native binary indirilebilir veya derleme işlemi çalışabilir.

pnpm build script güvenliği açıksa paket için build izni vermeniz gerekebilir:

```bash
pnpm approve-builds
```

Ardından:

```bash
pnpm rebuild argon2
```

kullanılabilir.

## Desteklenen ortamlar

Paket modern Node.js sürümleri için tasarlanmıştır.

Gerekli Node.js sürümü:

```text
Node.js >= 22
```

## Alpha sürümü

Bu paket alpha aşamasındadır.

Sonraki alpha sürümlerinde:

- Varsayılan hash parametreleri
- Constructor seçenekleri
- Hata davranışları
- TypeScript tipleri

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

`@mrt-identity/password-argon2`, MIT lisansı altında yayımlanır.