import env from '$/env';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const db = drizzle({
    connection: {
        url: env.DB_URL,
        authToken: env.DB_AUTH_TOKEN
    },
    schema: schema
});

export default db;