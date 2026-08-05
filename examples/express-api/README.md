# mrt-identity Express API örneği

Bu proje, `mrt-identity` paketlerinin Express ile nasıl kullanılabileceğini gösteren çalışan bir REST API örneğidir.

Örnek uygulamada aşağıdaki özellikler bulunur:

- Kullanıcı kaydı
- E-posta veya kullanıcı adıyla giriş
- Argon2id parola hashleme
- Güvenli opaque refresh token üretimi
- Session oluşturma
- Refresh token rotation
- Tek oturumdan çıkış
- Tüm oturumlardan çıkış
- Kullanıcı oturumlarını listeleme
- Başarısız giriş takibi
- Geçici brute-force engellemesi
- Standart HTTP hata cevapları
- Otomatik API entegrasyon testleri

## Kullanılan paketler

```text
@mrt-identity/core
@mrt-identity/adapter-memory
@mrt-identity/password-argon2
@mrt-identity/token-opaque
express
```

## Gereksinimler

- Node.js
- pnpm
- Git

Proje, `mrt-identity` monoreposunun bir parçasıdır. Örneği bağımsız olarak kopyalamak yerine monorepo kökünden çalıştırmanız önerilir.

## Kurulum

Repository kökünde:

```cmd
pnpm install
```

Gerekli `mrt-identity` paketlerini derleyin:

```cmd
pnpm --filter @mrt-identity/core build
pnpm --filter @mrt-identity/adapter-memory build
pnpm --filter @mrt-identity/password-argon2 build
pnpm --filter @mrt-identity/token-opaque build
```

Express örneğini typecheck ve build işleminden geçirin:

```cmd
pnpm --filter @mrt-identity/example-express-api typecheck
pnpm --filter @mrt-identity/example-express-api build
```

## Geliştirme sunucusu

```cmd
pnpm --filter @mrt-identity/example-express-api dev
```

Varsayılan adres:

```text
http://localhost:3000
```

Farklı bir port kullanmak için Windows CMD üzerinde:

```cmd
set PORT=4000
pnpm --filter @mrt-identity/example-express-api dev
```

## Health kontrolü

```http
GET /health
```

Örnek cevap:

```json
{
  "success": true,
  "service": "mrt-identity Express Example"
}
```

## API endpointleri

### Kullanıcı kaydı

```http
POST /auth/register
Content-Type: application/json
```

İstek:

```json
{
  "email": "mert@example.com",
  "username": "237mrt",
  "password": "GucluParola123!"
}
```

CMD örneği:

```cmd
curl -X POST http://localhost:3000/auth/register -H "Content-Type: application/json" -d "{\"email\":\"mert@example.com\",\"username\":\"237mrt\",\"password\":\"GucluParola123!\"}"
```

Başarılı cevap:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "mert@example.com",
      "username": "237mrt",
      "emailVerifiedAt": null,
      "status": "active",
      "createdAt": "2026-08-06T00:00:00.000Z",
      "updatedAt": "2026-08-06T00:00:00.000Z"
    }
  }
}
```

Parola ve parola hash değeri API cevabına eklenmez.

### Kullanıcı girişi

```http
POST /auth/login
Content-Type: application/json
```

İstek:

```json
{
  "identifier": "mert@example.com",
  "password": "GucluParola123!"
}
```

`identifier` alanında e-posta adresi veya kullanıcı adı kullanılabilir.

CMD örneği:

```cmd
curl -X POST http://localhost:3000/auth/login -H "Content-Type: application/json" -d "{\"identifier\":\"mert@example.com\",\"password\":\"GucluParola123!\"}"
```

Başarılı cevap:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user-id",
      "email": "mert@example.com",
      "username": "237mrt",
      "status": "active"
    },
    "session": {
      "id": "session-id",
      "userId": "user-id",
      "ipAddress": "::1",
      "userAgent": "curl",
      "revokedAt": null
    },
    "refreshToken": "rastgele-refresh-token",
    "passwordRehashed": false
  }
}
```

`refreshTokenHash` hiçbir API cevabında döndürülmez.

### Refresh token yenileme

```http
POST /auth/refresh
Content-Type: application/json
```

İstek:

```json
{
  "refreshToken": "mevcut-refresh-token"
}
```

CMD örneği:

```cmd
curl -X POST http://localhost:3000/auth/refresh -H "Content-Type: application/json" -d "{\"refreshToken\":\"REFRESH_TOKEN\"}"
```

Başarılı refresh işleminde yeni bir refresh token üretilir. Eski refresh token tekrar kullanılamaz.

Bu davranış refresh token rotation olarak adlandırılır.

### Tek oturumdan çıkış

```http
POST /auth/logout
Content-Type: application/json
```

İstek:

```json
{
  "refreshToken": "mevcut-refresh-token"
}
```

CMD örneği:

```cmd
curl -X POST http://localhost:3000/auth/logout -H "Content-Type: application/json" -d "{\"refreshToken\":\"REFRESH_TOKEN\"}"
```

Başarılı cevap:

```json
{
  "success": true,
  "data": {
    "revoked": true
  }
}
```

Aynı token ikinci kez gönderilirse işlem hata üretmez:

```json
{
  "success": true,
  "data": {
    "revoked": false
  }
}
```

### Tüm oturumlardan çıkış

```http
POST /auth/logout-all
x-user-id: user-id
```

CMD örneği:

```cmd
curl -X POST http://localhost:3000/auth/logout-all -H "x-user-id: USER_ID"
```

Başarılı cevap:

```json
{
  "success": true,
  "data": {
    "revokedCount": 2
  }
}
```

### Kullanıcı oturumlarını listeleme

```http
GET /auth/sessions
x-user-id: user-id
```

CMD örneği:

```cmd
curl http://localhost:3000/auth/sessions -H "x-user-id: USER_ID"
```

Varsayılan olarak yalnızca aktif ve süresi dolmamış oturumlar döndürülür.

İptal edilmiş oturumları da görmek için:

```cmd
curl "http://localhost:3000/auth/sessions?includeRevoked=true" -H "x-user-id: USER_ID"
```

Süresi dolmuş oturumları da görmek için:

```cmd
curl "http://localhost:3000/auth/sessions?includeExpired=true" -H "x-user-id: USER_ID"
```

Bütün oturumları görmek için:

```cmd
curl "http://localhost:3000/auth/sessions?includeRevoked=true&includeExpired=true" -H "x-user-id: USER_ID"
```

## Hata cevapları

Bütün hata cevapları ortak bir yapıya sahiptir:

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "E-posta, kullanıcı adı veya parola hatalı."
  }
}
```

Örnek hata kodları:

```text
INVALID_REQUEST
INVALID_EMAIL
INVALID_USERNAME
WEAK_PASSWORD
USER_EMAIL_ALREADY_EXISTS
USER_USERNAME_ALREADY_EXISTS
INVALID_CREDENTIALS
LOGIN_TEMPORARILY_BLOCKED
USER_ACCOUNT_LOCKED
USER_ACCOUNT_DISABLED
INVALID_REFRESH_TOKEN
SESSION_EXPIRED
SESSION_REVOKED
SESSION_USER_NOT_FOUND
ROUTE_NOT_FOUND
INTERNAL_SERVER_ERROR
```

## Brute-force koruması

Örnek uygulamada varsayılan olarak:

```text
15 dakika içinde 5 başarısız giriş
→ 15 dakika geçici engelleme
```

uygulanır.

Ayarlar `src/identity.ts` dosyasından değiştirilebilir:

```typescript
loginProtection: {
  enabled: true,
  maxAttempts: 5,
  attemptWindowMs: 15 * 60 * 1000,
  lockDurationMs: 15 * 60 * 1000,
  trackByIp: true
}
```

## Otomatik testler

Yalnızca Express örneğinin testlerini çalıştırmak için:

```cmd
pnpm --filter @mrt-identity/example-express-api test
```

Testler aşağıdaki akışları doğrular:

- Health endpointi
- Kullanıcı kaydı
- Tekrarlanan e-posta kontrolü
- Eksik alan doğrulaması
- Kullanıcı girişi
- Session oluşturma
- Yanlış parola kontrolü
- Refresh token rotation
- Eski refresh tokenın reddedilmesi
- Session listeleme
- Logout
- Tüm oturumlardan çıkış
- Bilinmeyen route kontrolü

Bütün monorepo testlerini çalıştırmak için:

```cmd
pnpm test
```

## Typecheck ve build

```cmd
pnpm --filter @mrt-identity/example-express-api typecheck
pnpm --filter @mrt-identity/example-express-api build
```

Bütün monorepo için:

```cmd
pnpm typecheck
pnpm test
pnpm build
```

## MemoryAdapter hakkında

Bu örnek `MemoryAdapter` kullanır.

MemoryAdapter verileri RAM içerisinde saklar:

```text
Sunucu çalışır → veriler kullanılabilir
Sunucu kapanır → bütün kullanıcılar ve sessionlar silinir
Sunucu yeniden başlar → boş veri deposuyla başlar
```

Bu nedenle örnek uygulama geliştirme, test ve öğrenme amaçlıdır.

Gerçek üretim ortamında PostgreSQL, MySQL veya MongoDB gibi kalıcı bir veritabanı kullanan adapter tercih edilmelidir.

## Güvenlik notu

`logout-all` ve `sessions` endpointleri kullanıcı kimliğini örnek olması amacıyla `x-user-id` header’ından alır.

```http
x-user-id: user-id
```

Bu yöntem üretim ortamında güvenli kabul edilmez. Gerçek bir uygulamada kullanıcı kimliği doğrulanmış bir access token, güvenli session cookie veya yetkilendirme middleware’i üzerinden alınmalıdır.

Refresh tokenlar:

- Loglara yazılmamalıdır.
- URL query parametresinde taşınmamalıdır.
- Tarayıcı uygulamalarında mümkünse güvenli ve `HttpOnly` cookie içerisinde saklanmalıdır.
- İstemci tarafında üçüncü taraf scriptlerle paylaşılmamalıdır.

## Proje yapısı

```text
express-api/
├── src/
│   ├── errors/
│   │   └── ApiError.ts
│   ├── middleware/
│   │   └── errorHandler.ts
│   ├── routes/
│   │   └── authRoutes.ts
│   ├── utils/
│   │   └── RequestValidation.ts
│   ├── app.ts
│   ├── identity.ts
│   └── server.ts
├── tests/
│   └── auth-api.test.ts
├── package.json
├── tsconfig.json
└── tsconfig.test.json
```

## Lisans

Bu örnek, `mrt-identity` repository lisansı kapsamında sunulur.
