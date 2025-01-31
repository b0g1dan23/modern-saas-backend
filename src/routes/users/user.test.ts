import { verify } from 'hono/jwt';
import { afterAll, beforeAll, describe, expect, it, test } from 'vitest';
import { generateTokens, saveRefreshToken } from './users.handlers';
import env from '@/env';
import redis from '@/db/redis';
import db from '@/db';
import { selectUsersSchema, tempVerificationEmailTable, User, usersTable } from '@/db/schema';
import { createTestApp } from '@/lib/create-app';
import usersRouter from './users.index';
import { eq } from 'drizzle-orm';
import { BAD_REQUEST, CREATED, OK } from '@/helpers/http-status-codes';

describe('Test generateTokens function', () => {
    let userID: string;
    let role: "guest" | "owner" | "admin";

    beforeAll(() => {
        userID = 'test-user-id';
        role = 'guest';
    })

    it("should generate valid access and refresh tokens", async () => {
        const { accessToken, refreshToken } = await generateTokens(userID, role);

        expect(accessToken).toBeDefined();
        expect(refreshToken).toBeDefined();

        const decodedAccessToken = await verify(accessToken, env.ACCESS_TOKEN_SECRET);
        const decodedRefreshToken = await verify(refreshToken, env.REFRESH_TOKEN_SECRET);

        expect(decodedAccessToken.userID).toBe(userID);
        expect(decodedAccessToken.role).toBe(role);
        expect(decodedRefreshToken.userID).toBe(userID);
        expect(decodedRefreshToken.role).toBe(role);
    })

    it('should set correct expiration times for tokens', async () => {
        const { accessToken, refreshToken } = await generateTokens(userID, role);

        const decodedAccessToken = await verify(accessToken, env.ACCESS_TOKEN_SECRET);
        const decodedRefreshToken = await verify(refreshToken, env.REFRESH_TOKEN_SECRET);

        const currentTime = Math.floor(Date.now() / 1000);

        expect(decodedAccessToken.exp).toBeGreaterThan(currentTime);
        expect(decodedAccessToken.exp).toBeLessThanOrEqual(currentTime + 60 * 15);

        expect(decodedRefreshToken.exp).toBeGreaterThan(currentTime);
        expect(decodedRefreshToken.exp).toBeLessThanOrEqual(currentTime + 60 * 60 * 24 * 7);
    });

    describe('saveRefreshToken', () => {
        it('should save refresh token in Redis with correct expiration', async () => {
            const { refreshToken } = await generateTokens(userID, role);
            await saveRefreshToken(userID, refreshToken);

            const storedToken = await redis.get(`refresh-token:${userID}`);
            expect(storedToken).toBe(refreshToken);

            const ttl = await redis.ttl(`refresh-token:${userID}`);
            expect(ttl).toBeGreaterThan(0);
            expect(ttl).toBeLessThanOrEqual(60 * 60 * 24 * 7);
            await redis.del(`refresh-token:${userID}`);
        });
    });
})

describe("Test registering new user", () => {
    const testRouter = createTestApp(usersRouter);
    let insertedUser: User & { password: string };

    let initialResponse: Response;

    beforeAll(async () => {
        initialResponse = await testRouter.request('/users', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: "testing@gmail.com",
                password: "password",
                name: "test"
            })
        })
        const data = await initialResponse.json();
        expect(initialResponse.status).toBe(CREATED);
        expect(data).toBeDefined();
    })

    afterAll(async () => {
        await db.delete(tempVerificationEmailTable).where(eq(tempVerificationEmailTable.userId, insertedUser.id));
        await db.delete(usersTable).where(eq(usersTable.id, insertedUser.id));
    })

    test("should return user already exists", async () => {
        const res = await testRouter.request('/users', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: "testing@gmail.com",
                password: "password",
                name: "test"
            })
        })
        const data = await res.json();
        expect(data).toEqual({ message: "User already exists!" });
        expect(res.status).toBe(BAD_REQUEST);
    })

    test("user is successfully found", async () => {
        const user = await db.query.usersTable.findFirst({ where: (table, { eq }) => eq(table.email, "testing@gmail.com") });
        expect(user).toBeDefined();
        expect(user?.password).toBeDefined();
        insertedUser = user as User & { password: string };
    })

    test("email should not be verified", async () => {
        expect(insertedUser.email_verified).toBe(false);
    })

    test("email verification link is created", async () => {
        const verification_link = await db.query.tempVerificationEmailTable.findFirst({ where: eq(tempVerificationEmailTable.userId, insertedUser.id) });
        expect(verification_link).toBeDefined();
    })

    test("check for cookies", async () => {
        type Cookie = {
            name: string;
            value: string;
        }

        const cookies: Cookie[] = initialResponse.headers
            .getSetCookie()
            .map((cookie) => cookie.split(";")).map((cookie) => {
                const [name, value] = cookie[0].split("=");
                return { name, value };
            })
        const accessToken = cookies.find(cookie => cookie.name === "accessToken");
        const refreshToken = cookies.find(cookie => cookie.name === "refreshToken");

        expect(accessToken).toBeDefined();
        expect(refreshToken).toBeDefined();

        const decodedAccessToken = await verify(accessToken!.value, env.ACCESS_TOKEN_SECRET);
        const decodedRefreshToken = await verify(refreshToken!.value, env.REFRESH_TOKEN_SECRET);

        expect(decodedAccessToken.userID).toBe(insertedUser.id);
        expect(decodedRefreshToken.userID).toBe(insertedUser.id);
        expect(decodedAccessToken.role).toBe(insertedUser.role);
        expect(decodedRefreshToken.role).toBe(insertedUser.role);
    })
})

describe("Test login user", () => {
    const testRouter = createTestApp(usersRouter);
    let insertedUser: User & { password: string };

    const testData: { email: string, password: string } = {
        email: "testing123@gmail.com",
        password: "password"
    }

    beforeAll(async () => {
        const res = await testRouter.request('/users', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name: "test123", ...testData })
        })
        const data = await res.json();
        expect(res.status).toBe(CREATED);
        expect(data).toBeDefined();

        insertedUser = data as User & { password: string };
    })

    afterAll(async () => {
        await db.delete(tempVerificationEmailTable).where(eq(tempVerificationEmailTable.userId, insertedUser.id)).execute();
        await db.delete(usersTable).where(eq(usersTable.id, insertedUser.id)).execute();
    })

    test("should return invalid email or password", async () => {
        const res = await testRouter.request('/users/login', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: testData.email,
                password: "passw0rd",
            })
        });
        const data = await res.json();
        expect(data).toEqual({ message: "Invalid email or password" });
        expect(res.status).toBe(BAD_REQUEST);
    })

    test("should login successfully", async () => {
        const res = await testRouter.request('/users/login', {
            method: 'post',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        })
        const data = await res.json();
        expect(data).toEqual(selectUsersSchema.parse(insertedUser));
        expect(res.status).toBe(OK);
    })
})