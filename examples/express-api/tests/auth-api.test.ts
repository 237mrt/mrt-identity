import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import request from "supertest";

import { createApp } from "../src/app.js";

import { identity } from "../src/identity.js";

const app = createApp();

interface RegisteredUser {
  id: string;
  email: string;
  username: string | null;
}

interface LoginData {
  user: RegisteredUser;

  session: {
    id: string;
    userId: string;
    revokedAt: string | null;
  };

  refreshToken: string;
  passwordRehashed: boolean;
}

async function registerUser(): Promise<RegisteredUser> {
  const response = await request(app)
    .post("/auth/register")
    .send({
      email: "mert@example.com",
      username: "237mrt",
      password: "GucluParola123!",
    })
    .expect(201);

  return response.body.data.user as RegisteredUser;
}

async function loginUser(): Promise<LoginData> {
  const response = await request(app)
    .post("/auth/login")
    .send({
      identifier: "mert@example.com",
      password: "GucluParola123!",
    })
    .expect(200);

  return response.body.data as LoginData;
}

describe("mrt-identity Express API", () => {
  beforeAll(async () => {
    await identity.start();
  });

  beforeEach(async () => {
    /*
     * MemoryAdapter içindeki kullanıcı,
     * session ve login-attempt kayıtlarını
     * her testten önce temizler.
     */
    await identity.adapter?.disconnect?.();
    await identity.adapter?.initialize?.();
  });

  afterAll(async () => {
    await identity.adapter?.disconnect?.();
  });

  it("health endpointi çalışmalıdır", async () => {
    const response = await request(app).get("/health").expect(200);

    expect(response.body).toEqual({
      success: true,
      service: "mrt-identity Express Example",
    });
  });

  it("yeni kullanıcı oluşturmalıdır", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        email: "mert@example.com",
        username: "237mrt",
        password: "GucluParola123!",
      })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: true,

        data: {
          user: expect.objectContaining({
            id: expect.any(String),
            email: "mert@example.com",
            username: "237mrt",
            status: "active",
          }),
        },
      }),
    );

    expect("password" in response.body.data.user).toBe(false);

    expect("passwordHash" in response.body.data.user).toBe(false);
  });

  it("aynı e-posta ile ikinci kaydı reddetmelidir", async () => {
    await registerUser();

    const response = await request(app)
      .post("/auth/register")
      .send({
        email: "mert@example.com",
        username: "other-user",
        password: "GucluParola123!",
      })
      .expect(409);

    expect(response.body).toEqual({
      success: false,

      error: {
        code: "USER_EMAIL_ALREADY_EXISTS",

        message: "Bu e-posta adresiyle kayıtlı bir kullanıcı bulunuyor.",
      },
    });
  });

  it("eksik alanları reddetmelidir", async () => {
    const response = await request(app)
      .post("/auth/register")
      .send({
        email: "mert@example.com",
      })
      .expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,

        error: expect.objectContaining({
          code: "INVALID_REQUEST",
        }),
      }),
    );
  });

  it("kullanıcı girişi yapıp session oluşturmalıdır", async () => {
    const user = await registerUser();
    const login = await loginUser();

    expect(login.user.id).toBe(user.id);

    expect(login.session).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        userId: user.id,
        revokedAt: null,
      }),
    );

    expect(login.refreshToken).toEqual(expect.any(String));

    expect(login.refreshToken.length).toBeGreaterThan(32);

    expect("refreshTokenHash" in login.session).toBe(false);
  });

  it("yanlış parolayı reddetmelidir", async () => {
    await registerUser();

    const response = await request(app)
      .post("/auth/login")
      .send({
        identifier: "mert@example.com",
        password: "YanlisParola123!",
      })
      .expect(401);

    expect(response.body).toEqual({
      success: false,

      error: {
        code: "INVALID_CREDENTIALS",

        message: "E-posta, kullanıcı adı veya parola hatalı.",
      },
    });
  });

  it("refresh token rotation yapmalıdır", async () => {
    await registerUser();

    const login = await loginUser();

    const refreshResponse = await request(app)
      .post("/auth/refresh")
      .send({
        refreshToken: login.refreshToken,
      })
      .expect(200);

    const newRefreshToken = refreshResponse.body.data.refreshToken as string;

    expect(newRefreshToken).toEqual(expect.any(String));

    expect(newRefreshToken).not.toBe(login.refreshToken);

    /*
     * Rotation sonrasında eski token
     * tekrar kullanılamamalıdır.
     */
    const oldTokenResponse = await request(app)
      .post("/auth/refresh")
      .send({
        refreshToken: login.refreshToken,
      })
      .expect(401);

    expect(oldTokenResponse.body.error.code).toBe("INVALID_REFRESH_TOKEN");
  });

  it("kullanıcının aktif sessionlarını listelemelidir", async () => {
    const user = await registerUser();
    const login = await loginUser();

    const response = await request(app)
      .get("/auth/sessions")
      .set("x-user-id", user.id)
      .expect(200);

    expect(response.body.data.sessions).toHaveLength(1);

    expect(response.body.data.sessions[0]).toEqual(
      expect.objectContaining({
        id: login.session.id,
        userId: user.id,
        revokedAt: null,
      }),
    );

    expect("refreshTokenHash" in response.body.data.sessions[0]).toBe(false);
  });

  it("tek sessiondan çıkış yapmalıdır", async () => {
    await registerUser();

    const login = await loginUser();

    const firstLogout = await request(app)
      .post("/auth/logout")
      .send({
        refreshToken: login.refreshToken,
      })
      .expect(200);

    expect(firstLogout.body.data.revoked).toBe(true);

    const secondLogout = await request(app)
      .post("/auth/logout")
      .send({
        refreshToken: login.refreshToken,
      })
      .expect(200);

    expect(secondLogout.body.data.revoked).toBe(false);
  });

  it("bütün sessionları kapatmalıdır", async () => {
    const user = await registerUser();

    await loginUser();
    await loginUser();

    const logoutResponse = await request(app)
      .post("/auth/logout-all")
      .set("x-user-id", user.id)
      .expect(200);

    expect(logoutResponse.body.data.revokedCount).toBe(2);

    const activeSessionsResponse = await request(app)
      .get("/auth/sessions")
      .set("x-user-id", user.id)
      .expect(200);

    expect(activeSessionsResponse.body.data.sessions).toHaveLength(0);

    const allSessionsResponse = await request(app)
      .get("/auth/sessions?includeRevoked=true")
      .set("x-user-id", user.id)
      .expect(200);

    expect(allSessionsResponse.body.data.sessions).toHaveLength(2);
  });

  it("x-user-id headerı olmadan session listesini reddetmelidir", async () => {
    const response = await request(app).get("/auth/sessions").expect(400);

    expect(response.body).toEqual(
      expect.objectContaining({
        success: false,

        error: expect.objectContaining({
          code: "INVALID_REQUEST",
        }),
      }),
    );
  });

  it("bilinmeyen route için 404 döndürmelidir", async () => {
    const response = await request(app).get("/bilinmeyen-route").expect(404);

    expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
  });
});
