# @mrt-identity/adapter-testkit

Özel `mrt-identity` adapterlarının ortak sözleşmelere uyup uymadığını doğrulamak için tekrar kullanılabilir Vitest testleri.

[![npm version](https://img.shields.io/npm/v/@mrt-identity/adapter-testkit.svg?label=npm)](https://www.npmjs.com/package/@mrt-identity/adapter-testkit)
[![npm alpha](https://img.shields.io/npm/v/@mrt-identity/adapter-testkit/alpha.svg?label=alpha)](https://www.npmjs.com/package/@mrt-identity/adapter-testkit)
[![license](https://img.shields.io/npm/l/@mrt-identity/adapter-testkit.svg)](../../LICENSE)

> [!NOTE]
> Bu paket normal uygulama geliştiricilerinden çok PostgreSQL, MySQL, MongoDB veya özel veri adapterı geliştiren paket yazarlarına yöneliktir.

## Amaç

Farklı adapter implementasyonlarının aynı davranışları göstermesi gerekir.

Örneğin bütün adapterlar:

- Kullanıcı oluşturabilmeli
- Kullanıcıyı ID ile bulabilmeli
- E-posta ve kullanıcı adı araması yapabilmeli
- Duplicate kayıtları reddedebilmeli
- Session oluşturup güncelleyebilmeli
- Refresh token hash ile session bulabilmeli
- Session iptal edebilmeli
- Başarısız giriş denemelerini takip edebilmeli

Adapter testkit bu davranışların ortak şekilde doğrulanmasını sağlar.

## Kurulum

pnpm:

```bash
pnpm add -D @mrt-identity/adapter-testkit@alpha
pnpm add -D vitest
```

npm:

```bash
npm install --save-dev @mrt-identity/adapter-testkit@alpha
npm install --save-dev vitest
```

Yarn:

```bash
yarn add --dev @mrt-identity/adapter-testkit@alpha
yarn add --dev vitest
```

## Gereksinimler

- Node.js 22 veya üzeri
- Vitest 4 veya üzeri
- `@mrt-identity/core`
- Test edilecek bir `IdentityAdapter` implementasyonu

## Sağlanan test grupları

Paket şu test gruplarını dışarı aktarır:

```typescript
import {
  runUserAdapterContractTests,
  runSessionAdapterContractTests,
  runLoginAttemptAdapterContractTests,
} from "@mrt-identity/adapter-testkit";
```

### Kullanıcı adapterı testleri

```typescript
runUserAdapterContractTests(
  factory,
);
```

Doğrulanan başlıca davranışlar:

- Kullanıcı oluşturma
- ID ile kullanıcı bulma
- E-posta ile kullanıcı bulma
- Kullanıcı adı ile kullanıcı bulma
- Kullanıcı güncelleme
- Kullanıcı silme
- Duplicate e-posta kontrolü
- Duplicate kullanıcı adı kontrolü

### Session adapterı testleri

```typescript
runSessionAdapterContractTests(
  factory,
);
```

Doğrulanan başlıca davranışlar:

- Session oluşturma
- ID ile session bulma
- Refresh token hash ile session bulma
- Kullanıcının sessionlarını listeleme
- Session güncelleme
- Tek session iptal etme
- Kullanıcının bütün sessionlarını iptal etme
- Süresi dolmuş sessionları silme

### Login-attempt adapterı testleri

```typescript
runLoginAttemptAdapterContractTests(
  factory,
);
```

Doğrulanan başlıca davranışlar:

- Giriş denemesi kaydetme
- Giriş denemesini bulma
- Başarısız giriş sayısını güncelleme
- Geçici engelleme süresini saklama
- Başarılı giriş sonrası kayıt temizleme
- Süresi geçmiş kayıtları temizleme

## Adapter factory

Testkit her test için temiz bir adapter oluşturabilmek amacıyla factory yapısı kullanır.

Örnek:

```typescript
import type {
  IdentityAdapterFactory,
} from "@mrt-identity/adapter-testkit";

import {
  MemoryAdapter,
} from "@mrt-identity/adapter-memory";

const factory:
  IdentityAdapterFactory = {
    async create() {
      const adapter =
        new MemoryAdapter();

      await adapter.initialize?.();

      return adapter;
    },

    async destroy(adapter) {
      await adapter.disconnect?.();
    },
  };
```

## Tam test örneği

```typescript
import {
  runLoginAttemptAdapterContractTests,
  runSessionAdapterContractTests,
  runUserAdapterContractTests,
  type IdentityAdapterFactory,
} from "@mrt-identity/adapter-testkit";

import {
  PostgreSQLAdapter,
} from "../src/index.js";

const factory:
  IdentityAdapterFactory = {
    async create() {
      const adapter =
        new PostgreSQLAdapter({
          connectionString:
            process.env.TEST_DATABASE_URL!,
        });

      await adapter.initialize?.();

      return adapter;
    },

    async destroy(adapter) {
      await adapter.disconnect?.();
    },
  };

runUserAdapterContractTests(
  factory,
);

runSessionAdapterContractTests(
  factory,
);

runLoginAttemptAdapterContractTests(
  factory,
);
```

Ardından:

```bash
pnpm vitest run
```

komutuyla bütün ortak adapter testleri çalıştırılır.

## Neden factory kullanılır?

Her test grubu:

- Temiz bir adapter örneği oluşturur.
- Test verilerini izole eder.
- Test tamamlandığında bağlantıyı kapatır.
- Bir testin verilerinin başka testi etkilemesini önler.

Kalıcı veritabanı adapterlarında factory içerisinde test tabloları veya test şeması temizlenebilir.

## Adapter geliştirme önerileri

Özel adapter geliştirirken:

- Tarih alanlarını gerçek `Date` nesnesi olarak döndürün.
- Public sonuçları değil, core sözleşmesindeki tam veri tiplerini uygulayın.
- Duplicate kayıt hatalarını core hata davranışına dönüştürün.
- Refresh tokenın düz metnini saklamayın.
- Session iptal işlemlerini tekrar çağrılabilir tasarlayın.
- Testleri izole bir veritabanı üzerinde çalıştırın.
- Production veritabanını adapter testlerinde kullanmayın.
- Test sonrasında bağlantıları mutlaka kapatın.

## Peer dependency

Bu paket Vitest’i peer dependency olarak kullanır:

```json
{
  "peerDependencies": {
    "vitest": ">=4.0.0"
  }
}
```

Adapter projesinin Vitest’i ayrıca kurması gerekir.

## Alpha sürümü

Bu paket alpha aşamasındadır.

Core adapter sözleşmeleri değişirse testkit API’si de sonraki alpha sürümlerinde değişebilir.

Adapter paketi sürümlerinin uyumlu `@mrt-identity/core` sürümüyle kullanılması önerilir.

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

`@mrt-identity/adapter-testkit`, MIT lisansı altında yayımlanır.