# MRT Identity

MRT Identity; Node.js ve TypeScript uygulamaları için geliştirilen, veritabanı ve web framework'ünden bağımsız, adaptör tabanlı bir kimlik doğrulama ve güvenlik framework'üdür.

## Projenin amacı

MRT Identity, geliştiricilerin her projede kayıt, giriş, oturum yönetimi ve güvenlik sistemlerini sıfırdan yazmak zorunda kalmamasını amaçlar.

Framework herhangi bir merkezi veritabanına bağlı değildir. Her geliştirici kendi veritabanını, kullanıcı modelini ve altyapısını kullanabilir.

## Planlanan özellikler

* Kullanıcı kaydı
* Kullanıcı girişi
* Güvenli parola hashleme
* Oturum yönetimi
* Refresh token yenileme
* Oturum sonlandırma
* Başarısız giriş takibi
* Brute-force koruması
* Geçici hesap kilitleme
* Şüpheli giriş tespiti
* Rol ve yetki yönetimi
* Event sistemi
* Plugin sistemi
* Özel veritabanı adaptörleri

## Adaptör mimarisi

MRT Identity kendi veritabanını zorunlu tutmaz.

Geliştiriciler hazır adaptörleri kullanabilir:

* PostgreSQL
* MySQL
* MongoDB
* SQLite
* Memory

Ayrıca kendi veritabanları veya servisleri için özel adaptör geliştirebilirler.

## Örnek kullanım

```typescript
import { MRTIdentityClient } from "@mrt-identity/core";

const identity = new MRTIdentityClient({
  applicationName: "Benim Uygulamam"
});

console.log(identity.applicationName);
```

## Proje durumu

MRT Identity şu anda erken geliştirme aşamasındadır.

İlk hedef, framework çekirdeğini ve bellek üzerinde çalışan test adaptörünü hazırlamaktır.

## Teknolojiler

* Node.js
* TypeScript
* pnpm
* Vitest
* ESM

## Lisans

Bu proje MIT lisansı altında yayımlanacaktır.
