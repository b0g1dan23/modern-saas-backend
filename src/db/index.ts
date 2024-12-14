import env from '@/env';
import { drizzle } from 'drizzle-orm/libsql';

const db = drizzle({
    connection: {
        url: env.DB_URL,
        authToken: env.DB_AUTH_TOKEN
    }
});

export default db;