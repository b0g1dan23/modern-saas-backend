import { insertUserSchema, selectUsersSchema } from "$/db/schema"
import { BAD_REQUEST, CREATED, NOT_FOUND, OK, PERMANENT_REDIRECT } from "$/helpers/http-status-codes"
import jsonContent from "$/helpers/json-content"
import jsonContentRequired from "$/helpers/json-content-required"
import notFoundSchema from "$/helpers/not-found-schema"
import rateLimiter from "$/middlewares/rate-limiter"
import { createRoute, z } from "@hono/zod-openapi"

enum UserTags {
    GOOGLE_LOGIN = 'Google Login',
    EMAIL_VERIFICATION = 'Email verification',
    FORGOT_PASSWORD = 'Forgot password',
    LOGIN_REGISTRATION = 'Login and registration',
    USERS = 'Users'
}

export const listAllUsers = createRoute({
    path: '/users',
    tags: [UserTags.USERS],
    method: 'get',
    responses: {
        [OK]: jsonContent(z.array(selectUsersSchema), "List of users")
    }
})

export const getOneUser = createRoute({
    path: "/users/{id}",
    tags: [UserTags.USERS],
    method: 'get',
    request: {
        params: z.object({
            id: z.string()
        })
    },
    responses: {
        [OK]: jsonContent(selectUsersSchema, "Requested user"),
        [NOT_FOUND]: notFoundSchema()
    }
})

export const registerUser = createRoute({
    path: '/users',
    tags: [UserTags.LOGIN_REGISTRATION],
    method: 'post',
    request: {
        body: jsonContent(insertUserSchema, "User credentials")
    },
    responses: {
        [CREATED]: jsonContent(selectUsersSchema, "User registered"),
        [BAD_REQUEST]: jsonContent(z.object({ message: z.string() }), "User already exists")
    }
})

export const loginUser = createRoute({
    path: '/users/login',
    tags: [UserTags.LOGIN_REGISTRATION],
    method: 'post',
    request: {
        body: jsonContent(z.object({
            email: z.string(),
            password: z.string(),
            remember: z.boolean().optional()
        }), "User credentials")
    },
    responses: {
        [OK]: jsonContent(selectUsersSchema, "Login successful"),
        [BAD_REQUEST]: jsonContent(z.object({
            message: z.string()
        }), "Invalid email or password"),
        [NOT_FOUND]: notFoundSchema()
    }
})

export const logoutUser = createRoute({
    path: '/users/logout',
    tags: [UserTags.LOGIN_REGISTRATION],
    method: 'post',
    responses: {
        [OK]: jsonContent(z.object({
            message: z.string().default("Logged out")
        }), "Logged out")
    }
})

export const verifyEmail = createRoute({
    path: "/users/verify-email/{id}",
    tags: [UserTags.EMAIL_VERIFICATION],
    method: 'get',
    request: {
        params: z.object({
            id: z.string()
        })
    },
    responses: {
        [OK]: jsonContent(z.object({
            message: z.string().default("Email successfully verified")
        }), "Email verified"),
        [NOT_FOUND]: notFoundSchema(),
        [BAD_REQUEST]: jsonContent(z.object({
            message: z.string().default("Verification link expired")
        }), "Verification link expired")
    }
})

export const resendVerificationEmail = createRoute({
    path: "/users/verify-email",
    tags: [UserTags.EMAIL_VERIFICATION],
    method: 'post',
    request: {
        headers: z.object({
            Authorization: z.string().describe("Bearer token").startsWith("Bearer "),
        }),
    },
    responses: {
        [OK]: jsonContent(z.object({
            message: z.string().default("Verification email sent")
        }), "Verification email sent"),
        [BAD_REQUEST]: jsonContent(z.object({
            message: z.string().default("No refresh token found")
        }), "No refresh token found")
    }
})

export const sendForgotPasswordEmail = createRoute({
    path: "/users/forgot-password",
    middleware: [rateLimiter()] as const,
    tags: [UserTags.FORGOT_PASSWORD],
    method: 'post',
    request: {
        body: jsonContent(z.object({
            email: z.string()
        }), "Email address")
    },
    responses: {
        [OK]: jsonContent(z.object({
            message: z.string().default("Verification email sent")
        }), "Verification email sent"),
        [BAD_REQUEST]: jsonContent(z.object({
            message: z.string().default("No refresh token found")
        }), "No refresh token found")
    }
})

export const validatePassword = createRoute({
    path: "/users/forgot-password/{id}",
    tags: [UserTags.FORGOT_PASSWORD],
    method: 'get',
    request: {
        params: z.object({
            id: z.string()
        }),
        body: jsonContent(z.object({
            newPassword: z.string().min(8)
        }), "Password details")
    },
    responses: {
        [OK]: jsonContent(z.object({
            message: z.string().default("Password successfully changed")
        }), "Password verified"),
        [NOT_FOUND]: notFoundSchema(),
        [BAD_REQUEST]: jsonContent(z.object({
            message: z.string().default("Verification link expired")
        }), "Verification link expired")
    }
})

export const awakeAccessToken = createRoute({
    path: "/users/newAccessToken",
    tags: [UserTags.LOGIN_REGISTRATION],
    method: "post",
    request: {
        body: jsonContentRequired(z.object({
            refreshToken: z.string()
        }), "Refresh token"),
    },
    responses: {
        [OK]: jsonContent(z.object({
            accessToken: z.string()
        }),
            "New access token"
        ),
        [BAD_REQUEST]: jsonContent(z.object({
            message: z.string().default("Invalid refresh token")
        }), "Invalid refresh token")
    }
})

export const googleLogin = createRoute({
    path: '/users/oauth/google',
    tags: [UserTags.GOOGLE_LOGIN],
    method: 'post',
    responses: {
        [OK]: jsonContent(z.object({ url: z.string() }), "Google login URL")
    }
})

export const googleCallback = createRoute({
    path: '/users/oauth/google/callback',
    tags: [UserTags.GOOGLE_LOGIN],
    method: 'get',
    responses: {
        [PERMANENT_REDIRECT]: {
            description: "Redirect to frontend",
        },
        [BAD_REQUEST]: jsonContent(z.object({
            message: z.string().default("Google login failed")
        }), "Google login failed")
    }
})

export type ListUsersRoute = typeof listAllUsers;
export type GetOneUserRoute = typeof getOneUser;
export type RegisterUserRoute = typeof registerUser;
export type LoginUserRoute = typeof loginUser;
export type LogoutUserRoute = typeof logoutUser;
export type VerifyEmailRoute = typeof verifyEmail;
export type AwakeAccessTokenRoute = typeof awakeAccessToken;
export type ResendVerificationRoute = typeof resendVerificationEmail;

export type ForgotPasswordRoute = typeof sendForgotPasswordEmail;
export type ValidatePasswordRoute = typeof validatePassword;

export type GoogleLoginRoute = typeof googleLogin;
export type GoogleCallbackRoute = typeof googleCallback;