import { z, ZodError } from 'zod';
import { config } from 'dotenv';
import { expand } from 'dotenv-expand';

expand(config());

const EnvSchema = z.object({
    NODE_ENV: z.string().default('development'),
    PORT: z.coerce.number().default(3000),
    LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),
    DB_URL: z.string().url(),
    DB_AUTH_TOKEN: z.string().optional(),
    REFRESH_TOKEN_SECRET: z.string(),
    ACCESS_TOKEN_SECRET: z.string(),
    REDIS_URL: z.string().url(),
    MAILJET_API_KEY: z.string(),
    MAILJET_SECRET_KEY: z.string(),
    BASE_URL: z.string().url(),
    GOOGLE_CLIENT_ID: z.string(),
    GOOGLE_CLIENT_SECRET: z.string(),
    GOOGLE_REDIRECT_URL: z.string().url(),
}).superRefine((input, ctx) => {
    if (input.NODE_ENV === "production" && !input.DB_AUTH_TOKEN) {
        ctx.addIssue({
            code: z.ZodIssueCode.invalid_type,
            expected: 'string',
            received: 'undefined',
            path: ['DB_AUTH_TOKEN'],
            message: "Must be set when NODE_ENV is 'production'",
        })
    }
})

export type envType = z.infer<typeof EnvSchema>;

let env: envType;
try {
    env = EnvSchema.parse(process.env);
} catch (err) {
    const e = err as ZodError;
    console.error("Invalid ENV: ");
    console.error(e.flatten().fieldErrors);
    process.exit(1);
}

export default env;