import env from '@/env';
import { pinoLogger } from 'hono-pino'
import pino, { levels } from 'pino';
import { PinoPretty } from 'pino-pretty';

const custom_logger = () => {
    return pinoLogger({
        pino: pino({ level: env.LOG_LEVEL || "info" }, env.NODE_ENV === 'production' ? undefined : PinoPretty()),
        http: {
            reqId: () => crypto.randomUUID()
        }
    });
}

export default custom_logger