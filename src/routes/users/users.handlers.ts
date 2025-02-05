import { AppBindings, AppRouteHandler } from "@/types";
import type { GetOneUserRoute, GoogleCallbackRoute, GoogleLoginRoute, ListUsersRoute, LoginUserRoute, LogoutUserRoute, RegisterUserRoute, ResendVerificationRoute, VerifyEmailRoute } from "./users.routes";
import db from "@/db";
import { BAD_REQUEST, CREATED, NOT_FOUND, OK, PERMANENT_REDIRECT } from "@/helpers/http-status-codes";
import { selectUsersSchema, tempVerificationEmailTable, usersTable } from "@/db/schema";
import { decode, sign, verify } from 'hono/jwt';
import env from "@/env";
import redis from "@/db/redis";
import { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { eq } from "drizzle-orm";
import { sendMail } from "@/lib/send-mail";


export const generateTokens = async (userID: string, role: "guest" | "owner" | "admin") => {
    const accessToken = await sign({ userID, role, exp: Math.floor(Date.now() / 1000) + 60 * 15 }, env.ACCESS_TOKEN_SECRET);
    const refreshToken = await sign({ userID, role, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, env.REFRESH_TOKEN_SECRET);

    return { accessToken, refreshToken };
}

export const saveRefreshToken = async (userID: string, refreshToken: string) => {
    await redis.set(`refresh-token:${userID}`, refreshToken, "EX", 60 * 60 * 24 * 7)
}

const saveTokensCookies = (c: Context<AppBindings>, refreshToken: string, accessToken: string) => {
    setCookie(c, "accessToken", accessToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: env.NODE_ENV === 'production',
        maxAge: 60 * 15
    });

    setCookie(c, "refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7
    })
}

const createVerificationLink = async (userID: string) => {
    const [verificationID] = await db.insert(tempVerificationEmailTable).values({ userId: userID }).returning();
    const verification_link = `${env.BASE_URL}/api/v1/users/verify-email/${verificationID.id}`;
    return verification_link;
}

export const listAllUsers: AppRouteHandler<ListUsersRoute> = async (c) => {
    const users = await db.query.usersTable.findMany().then((users) => users.map(user => selectUsersSchema.parse(user)));
    return c.json(users, OK);
}

export const getOneUser: AppRouteHandler<GetOneUserRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const user = await db.query.usersTable.findFirst({ where: (table, { eq }) => eq(table.id, id) });

    if (user === undefined) {
        return c.json({ message: "Not found!" }, NOT_FOUND);
    }

    return c.json(selectUsersSchema.parse(user), OK);
}

export const registerUser: AppRouteHandler<RegisterUserRoute> = async (c) => {
    const { email, password, name } = c.req.valid("json");

    const existingUser = await db.query.usersTable.findFirst({ where: (table, { eq }) => eq(table.email, email) });

    if (!password) {
        return c.json({ message: "Password is required!" }, BAD_REQUEST);
    }

    if (existingUser !== undefined) {
        return c.json({ message: "User already exists!" }, BAD_REQUEST);
    }

    const hashedPassword = await Bun.password.hash(password)

    const [inserted] = await db.insert(usersTable).values({ email, password: hashedPassword, name }).returning();

    // Send mail
    const verification_link = await createVerificationLink(inserted.id);
    await sendMail([{ Email: inserted.email, Name: inserted.name }], `Hi ${inserted.name}, one more step left to go 😆`, verification_link);

    const { accessToken, refreshToken } = await generateTokens(inserted.id, inserted.role);
    await saveRefreshToken(inserted.id, refreshToken);

    saveTokensCookies(c, refreshToken, accessToken);

    return c.json(selectUsersSchema.parse(inserted), CREATED);
}

export const loginUser: AppRouteHandler<LoginUserRoute> = async (c) => {
    const { email, password } = c.req.valid("json");

    const user = await db.query.usersTable.findFirst({ where: (table, { eq }) => eq(table.email, email) });

    if (user === undefined || !(await Bun.password.verify(password, user.password!))) {
        return c.json({ message: "Invalid email or password" }, BAD_REQUEST);
    }

    const { accessToken, refreshToken } = await generateTokens(user.id, user.role);
    await saveRefreshToken(user.id, refreshToken);

    saveTokensCookies(c, refreshToken, accessToken);

    return c.json(selectUsersSchema.parse(user), OK);
}

export const logout: AppRouteHandler<LogoutUserRoute> = async (c) => {
    const refreshToken = getCookie(c, "refreshToken");

    if (refreshToken) {
        const { userID } = await verify(refreshToken, env.REFRESH_TOKEN_SECRET) as { userID: string };
        await redis.del(`refresh-token:${userID}`);
    }

    deleteCookie(c, "accessToken");
    deleteCookie(c, "refreshToken");

    return c.json({ message: "Logged out" }, OK);
}

export const verifyEmail: AppRouteHandler<VerifyEmailRoute> = async (c) => {
    const { id } = c.req.valid("param");

    const existingVerification = await db.query.tempVerificationEmailTable.findFirst({ where: (table, { eq }) => eq(table.id, id) });

    if (!existingVerification) {
        return c.json({ message: "Not found" }, NOT_FOUND);
    }

    if (existingVerification.expiresOn < new Date()) {
        return c.json({ message: "Verification link expired" }, BAD_REQUEST);
    }

    await db.update(usersTable).set({ email_verified: true }).where(eq(usersTable.id, existingVerification.userId)).execute();

    return c.json({ message: "Email verified successfully" }, OK);
}

export const resendVerificationEmail: AppRouteHandler<ResendVerificationRoute> = async (c) => {
    const data = getCookie(c, "refreshToken");

    if (!data) {
        return c.json({ message: "No refresh token found" }, BAD_REQUEST);
    }

    const { userID } = await verify(data, env.REFRESH_TOKEN_SECRET) as { userID: string };

    await db.delete(tempVerificationEmailTable).where(eq(tempVerificationEmailTable.userId, userID)).execute();
    const user = await db.query.usersTable.findFirst({ where: (table, { eq }) => eq(table.id, userID) });

    if (!user) {
        return c.json({ message: "No user found!" }, BAD_REQUEST);
    }

    const verification_link = await createVerificationLink(userID);
    await sendMail([{ Email: user.email, Name: user.name }], `${user.name}, you missed first time, huh? 😆`, verification_link);

    return c.json({ message: "Verification email sent" }, OK);
}

export const googleLogin: AppRouteHandler<GoogleLoginRoute> = async (c) => {
    const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: env.GOOGLE_REDIRECT_URL,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent'
    })

    return c.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, PERMANENT_REDIRECT);
}

export const googleRedirect: AppRouteHandler<GoogleCallbackRoute> = async (c) => {
    const { code } = c.req.query();

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: env.GOOGLE_REDIRECT_URL,
            grant_type: 'authorization_code'
        })
    })

    if (!tokenResponse.ok) {
        return c.json({ message: "Failed to login with Google" }, BAD_REQUEST);
    }

    const { id_token } = await tokenResponse.json();

    const { payload } = decode(id_token);
    const { email, name } = payload as { email: string, name: string };

    let user = await db.query.usersTable.findFirst({ where: (table, { eq }) => eq(table.email, email) });

    if (!user) {
        const [newUser] = await db.insert(usersTable).values({ email, name, email_verified: true, }).returning();

        user = newUser;
    }

    const { accessToken, refreshToken } = await generateTokens(user.id, user.role);
    await saveRefreshToken(user.id, refreshToken);

    saveTokensCookies(c, refreshToken, accessToken);

    return c.json({ message: "Google login successful" }, OK);
}