import { Context } from "hono";
import { getConnInfo } from 'hono/bun'

const requestCounts = new Map<string, { timestamps: number[] }>();

const rateLimiter = () => {
    return async (c: Context, next: Function) => {
        const connInfo = getConnInfo(c);
        const currentTime = Date.now();
        const timeWindow = 15 * 60 * 1000;
        const maxRequests = 2;

        const addr = connInfo.remote.address;

        if (!addr) {
            return c.json({ message: 'Greška na serveru' }, 500);
        }

        if (!requestCounts.has(addr)) {
            requestCounts.set(addr, { timestamps: [] });
        }

        const userRequests = requestCounts.get(addr)!.timestamps;

        const recentRequests = userRequests.filter(timestamp => currentTime - timestamp <= timeWindow);

        if (recentRequests.length >= maxRequests) {
            return c.json({ message: 'Previše pokušaja. Molimo pokušajte ponovo kasnije.' }, 429);
        }

        recentRequests.push(currentTime);

        requestCounts.set(addr, { timestamps: recentRequests });

        return next();
    };
}

export default rateLimiter;