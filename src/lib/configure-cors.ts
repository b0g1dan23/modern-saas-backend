import { AppOpenAPI } from "$/types";
import { cors } from "hono/cors";

const configureCORS = (app: AppOpenAPI) => {
    const allowedOrigins = ['http://localhost:3000'];

    app.use("/api/*", cors({
        origin: (origin) => {
            if (!origin) return '';
            return allowedOrigins.includes(origin) ? origin : '';
        },
        allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }))
}

export default configureCORS;