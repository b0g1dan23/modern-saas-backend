import { Context } from "hono";
import type { NotFoundHandler } from 'hono';

const notFound: NotFoundHandler = (c: Context) => {
    return c.json({ message: `Not found - ${c.req.path}` }, 404);
}

export default notFound;