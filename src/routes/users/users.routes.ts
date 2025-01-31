import { insertUserSchema, selectUsersSchema } from "@/db/schema"
import { BAD_REQUEST, CREATED, MOVED_PERMANENTLY, NOT_FOUND, OK } from "@/helpers/http-status-codes"
import IDParamsSchema from "@/helpers/id-params-schema"
import jsonContent from "@/helpers/json-content"
import notFoundSchema from "@/helpers/not-found-schema"
import { createRoute, z } from "@hono/zod-openapi"

const tags = ['Users']

export const listAllUsers = createRoute({
    path: '/users',
    tags,
    method: 'get',
    responses: {
        [OK]: jsonContent(z.array(selectUsersSchema), "List of users")
    }
})

export const getOneUser = createRoute({
    path: "/users/{id}",
    tags,
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
    tags,
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
    tags,
    method: 'post',
    request: {
        body: jsonContent(z.object({
            email: z.string(),
            password: z.string()
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
    tags,
    method: 'post',
    responses: {
        [OK]: jsonContent(z.object({
            message: z.string().default("Logged out")
        }), "Logged out")
    }
})

export const verifyEmail = createRoute({
    path: "/users/verify-email/{id}",
    tags,
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
    tags,
    method: 'post',
    responses: {
        [OK]: jsonContent(z.object({
            message: z.string().default("Verification email sent")
        }), "Verification email sent"),
        [BAD_REQUEST]: jsonContent(z.object({
            message: z.string().default("No refresh token found")
        }), "No refresh token found")
    }
})

export const googleLogin = createRoute({
    path: '/users/oauth/google',
    tags,
    method: 'post',
    responses: {
        [MOVED_PERMANENTLY]: {
            description: "Redirecting to Google consent screen"
        }
    }
})

export const googleCallback = createRoute({
    path: '/users/oauth/google/callback',
    tags,
    method: 'get',
    responses: {
        [OK]: jsonContent(z.object({
            message: z.string().default("Google login successful")
        }), "Google login successful"),
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
export type ResendVerificationRoute = typeof resendVerificationEmail;

export type GoogleLoginRoute = typeof googleLogin;
export type GoogleCallbackRoute = typeof googleCallback;