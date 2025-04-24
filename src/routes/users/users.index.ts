import { createRouter } from "$/lib/create-app";
import * as routes from './users.routes'
import * as handlers from './users.handlers'

const router = createRouter()
    .openapi(routes.listAllUsers, handlers.listAllUsers)
    .openapi(routes.getOneUser, handlers.getOneUser)
    .openapi(routes.registerUser, handlers.registerUser)
    .openapi(routes.loginUser, handlers.loginUser)
    .openapi(routes.logoutUser, handlers.logout)
    .openapi(routes.resendVerificationEmail, handlers.resendVerificationEmail)
    .openapi(routes.awakeAccessToken, handlers.awakeAccessToken)
    .openapi(routes.sendForgotPasswordEmail, handlers.sendForgotPasswordEmail)
    .openapi(routes.validatePassword, handlers.validateForgotPassword)
    .openapi(routes.verifyEmail, handlers.verifyEmail)
    .openapi(routes.googleLogin, handlers.googleLogin)
    .openapi(routes.googleCallback, handlers.googleRedirect)

export default router;