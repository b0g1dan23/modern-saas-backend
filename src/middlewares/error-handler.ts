import env from "@/env";
import { INTERNAL_SERVER_ERROR, OK } from "@/helpers/http-status-codes";
import { Context, ErrorHandler } from "hono";
import { StatusCode } from "hono/utils/http-status";

const onError: ErrorHandler = (err, c) => {
    const currentStatus = "status" in err ? err.status : c.newResponse(null).status;
    const statusCode = currentStatus !== OK ? (currentStatus as StatusCode) : INTERNAL_SERVER_ERROR;
    const environment = c.env?.NODE_ENV || env.NODE_ENV;
    return c.json({ message: err.message, stack: environment === 'production' ? undefined : err.stack }, 500);
}

export default onError;