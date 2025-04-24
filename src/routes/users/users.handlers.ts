import { AppBindings, AppRouteHandler } from "$/types"
import type { AwakeAccessTokenRoute, ForgotPasswordRoute, GetOneUserRoute, GoogleCallbackRoute, GoogleLoginRoute, ListUsersRoute, LoginUserRoute, LogoutUserRoute, RegisterUserRoute, ResendVerificationRoute, ValidatePasswordRoute, VerifyEmailRoute } from "./users.routes";
import db from "$/db";
import { BAD_REQUEST, CREATED, NOT_FOUND, OK, PERMANENT_REDIRECT } from "$/helpers/http-status-codes";
import { resetPasswordTable, selectUsersSchema, tempVerificationEmailTable, User, usersTable } from "$/db/schema";
import { decode, sign, verify } from 'hono/jwt';
import env from "$/env";
import redis from "$/db/redis";
import { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from 'hono/cookie'
import { eq } from "drizzle-orm";
import { sendMail, sendResetPasswordEmail } from "$/lib/send-mail";

export const generateTokens = async (user: User) => {
    const accessToken = await sign({ userID: user.id, role: user.role, email_verified: user.email_verified, user_photo: user.profilna_slika, exp: Math.floor(Date.now() / 1000) + 60 * 60 }, env.ACCESS_TOKEN_SECRET);
    const refreshToken = await sign({ userID: user.id, role: user.role, email_verified: user.email_verified, user_photo: user.profilna_slika, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 }, env.REFRESH_TOKEN_SECRET);

    return { accessToken, refreshToken };
}

export const saveRefreshToken = async (userID: string, refreshToken: string) => {
    await redis.set(`refresh-token:${userID}`, refreshToken, "EX", 60 * 60 * 24 * 7)
}

const saveTokensCookies = (c: Context<AppBindings>, refreshToken: string, accessToken: string) => {
    setCookie(c, "accessToken", accessToken, {
        httpOnly: true,
        sameSite: "lax",
        secure: env.NODE_ENV === 'production',
        maxAge: 60 * 60
    });

    setCookie(c, "refreshToken", refreshToken, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7
    })
}

const createVerificationLink = async (userID: string) => {
    const [verificationID] = await db.insert(tempVerificationEmailTable).values({ userId: userID }).returning();
    const verification_link = `${env.FRONTEND_URL}/register/verify-email?verificationID=${verificationID.id}`;
    return verification_link;
}

const createResetPasswordLink = async (userID: string) => {
    const [verificationID] = await db.insert(resetPasswordTable).values({ userId: userID }).returning();
    const verification_link = `${env.FRONTEND_URL}/login/forgot-pw?verificationID=${verificationID.id}`;
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
        return c.json({ message: "User not found!" }, NOT_FOUND);
    }

    return c.json(selectUsersSchema.parse(user), OK);
}

export const registerUser: AppRouteHandler<RegisterUserRoute> = async (c) => {
    const { email, password, ime, prezime } = c.req.valid("json");

    const existingUser = await db.query.usersTable.findFirst({ where: (table, { eq }) => eq(table.email, email) });

    if (!password) {
        return c.json({ message: "Password is required!" }, BAD_REQUEST);
    }

    if (existingUser !== undefined) {
        return c.json({ message: "User already exists!" }, BAD_REQUEST);
    }

    const hashedPassword = await Bun.password.hash(password)

    const [inserted] = await db.insert(usersTable).values({ email, password: hashedPassword, ime, prezime }).returning();

    const { accessToken, refreshToken } = await generateTokens(inserted);

    await saveRefreshToken(inserted.id, refreshToken);

    saveTokensCookies(c, refreshToken, accessToken);

    return c.json(selectUsersSchema.parse(inserted), CREATED);
}

export const loginUser: AppRouteHandler<LoginUserRoute> = async (c) => {
    const { email, password, remember } = c.req.valid("json");

    const user = await db.query.usersTable.findFirst({ where: (table, { eq }) => eq(table.email, email) });

    if (user === undefined || !(await Bun.password.verify(password, user.password!))) {
        return c.json({ message: "Incorrect email or password" }, BAD_REQUEST);
    }

    const { accessToken, refreshToken } = await generateTokens(user);
    if (remember) {
        await saveRefreshToken(user.id, refreshToken);

        saveTokensCookies(c, refreshToken, accessToken);
    } else {
        setCookie(c, "accessToken", accessToken, {
            httpOnly: true,
            sameSite: "lax",
            secure: env.NODE_ENV === 'production',
            maxAge: 60 * 60
        });
    }


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

    return c.json({ message: "Logged in successfully!" }, OK);
}

export const verifyEmail: AppRouteHandler<VerifyEmailRoute> = async (c) => {
    const { id } = c.req.valid("param");

    const existingVerification = await db.query.tempVerificationEmailTable.findFirst({ where: (table, { eq }) => eq(table.id, id) });

    if (!existingVerification) {
        return c.json({ message: "Could not find verification!" }, NOT_FOUND);
    }

    if (existingVerification.expiresOn < new Date()) {
        return c.json({ message: "Link has expired" }, BAD_REQUEST);
    }

    await db.update(usersTable).set({ email_verified: true }).where(eq(usersTable.id, existingVerification.userId)).execute();
    await db.delete(tempVerificationEmailTable).where(eq(tempVerificationEmailTable.userId, existingVerification.userId)).execute();

    return c.json({ message: "Mail successfully verified!" }, OK);
}

export const resendVerificationEmail: AppRouteHandler<ResendVerificationRoute> = async (c) => {
    const accessToken = c.req.valid('header').Authorization.split(' ')[1];

    const { userID } = await verify(accessToken, env.ACCESS_TOKEN_SECRET) as { userID: string };

    await db.delete(tempVerificationEmailTable).where(eq(tempVerificationEmailTable.userId, userID)).execute();
    const user = await db.query.usersTable.findFirst({ where: (table, { eq }) => eq(table.id, userID) });

    if (!user) {
        return c.json({ message: "User not found!" }, BAD_REQUEST);
    }

    if (user.email_verified) {
        return c.json({ message: "Mail is already verified!" }, BAD_REQUEST);
    }

    const verification_link = await createVerificationLink(user.id);
    await sendMail([{ Email: user.email, Name: user.ime }], `${user.ime}, just one more thing to do 😆`, verification_link);

    return c.json({ message: "Verification mail has been sent" }, OK);
}

export const sendForgotPasswordEmail: AppRouteHandler<ForgotPasswordRoute> = async (c) => {
    const { email } = c.req.valid("json");

    const user = await db.query.usersTable.findFirst({ where: (table, { eq }) => eq(table.email, email) });

    if (!user) {
        return c.json({ message: "User not found!" }, BAD_REQUEST);
    }

    if (!user.password) {
        return c.json({ message: "User does not have password set" }, BAD_REQUEST);
    }

    await db.delete(resetPasswordTable).where(eq(resetPasswordTable.userId, user.id)).execute();

    const verification_link = await createResetPasswordLink(user.id);
    await sendResetPasswordEmail([{ Email: user.email, Name: user.ime }], verification_link);

    return c.json({ message: "Mail for password reset has been sent" }, OK);
}

export const validateForgotPassword: AppRouteHandler<ValidatePasswordRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const { newPassword } = c.req.valid("json");

    const existingVerification = await db.query.resetPasswordTable.findFirst({ where: (table, { eq }) => eq(table.id, id) });

    if (!existingVerification) {
        return c.json({ message: "Request for password reset could not be found!" }, NOT_FOUND);
    }

    if (existingVerification.expiresOn < new Date()) {
        return c.json({ message: "Verification link has expired" }, BAD_REQUEST);
    }

    const user = await db.query.usersTable.findFirst({ where: (table, { eq }) => eq(table.id, existingVerification.userId) });

    if (!user) {
        return c.json({ message: "User not found!" }, NOT_FOUND);
    }

    if (await Bun.password.verify(newPassword, user.password!)) {
        return c.json({ message: "This is your old password, please set another one" }, BAD_REQUEST);
    }

    const hashedNewPassword = await Bun.password.hash(newPassword);

    await db.update(usersTable).set({ password: hashedNewPassword }).where(eq(usersTable.id, existingVerification.userId)).execute();
    await db.delete(resetPasswordTable).where(eq(resetPasswordTable.userId, existingVerification.userId)).execute();

    return c.json({ message: "Password changed successfully" }, OK);
}

export const awakeAccessToken: AppRouteHandler<AwakeAccessTokenRoute> = async (c) => {
    const { refreshToken } = c.req.valid('json');

    let userID: string;
    try {
        const data = await verify(refreshToken, env.REFRESH_TOKEN_SECRET) as { userID: string };
        userID = data.userID;
    } catch (err) {
        return c.json({ message: "Refresh token is not valid" }, BAD_REQUEST);
    }

    const user = await db.query.usersTable.findFirst({ where: (table, { eq }) => eq(table.id, userID) });

    if (!user) {
        return c.json({ message: "User not found!" }, BAD_REQUEST);
    }

    const { accessToken } = await generateTokens(user);
    saveTokensCookies(c, refreshToken, accessToken);

    return c.json({ accessToken }, OK);
}

export const googleLogin: AppRouteHandler<GoogleLoginRoute> = async (c) => {
    const params = new URLSearchParams({
        client_id: env.GOOGLE_CLIENT_ID,
        redirect_uri: env.GOOGLE_REDIRECT_URL,
        response_type: 'code',
        scope: 'openid email profile',
        access_type: 'offline',
        prompt: 'consent'
    });

    return c.json({ url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` }, OK);
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
        return c.json({ message: "Logging through Google unsuccessfull!" }, BAD_REQUEST);
    }

    const { id_token } = await tokenResponse.json();

    const { payload } = decode(id_token);
    const { email, given_name, family_name, picture } = payload as { email: string, given_name: string, family_name: string, picture: string };

    let user = await db.query.usersTable.findFirst({ where: (table, { eq }) => eq(table.email, email) });

    if (!user) {
        const [newUser] = await db.insert(usersTable).values({ email, ime: given_name, prezime: family_name, email_verified: true, profilna_slika: picture }).returning();

        user = newUser;
    }

    if (!user.profilna_slika) {
        await db.update(usersTable).set({ profilna_slika: picture }).where(eq(usersTable.id, user.id)).execute();
        user.profilna_slika = picture;
    }

    if (user.email_verified === false) {
        await db.update(usersTable).set({ email_verified: true }).where(eq(usersTable.id, user.id)).execute();
        user.email_verified = true;
    }

    const { accessToken, refreshToken } = await generateTokens(user);
    await saveRefreshToken(user.id, refreshToken);

    saveTokensCookies(c, refreshToken, accessToken);

    return c.redirect(new URL(`${env.FRONTEND_URL}/dashboard`), PERMANENT_REDIRECT);
}