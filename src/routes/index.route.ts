import { OK } from "$/helpers/http-status-codes";
import jsonContent from "$/helpers/json-content";
import { createRouter } from "$/lib/create-app";
import { createRoute, z } from "@hono/zod-openapi";

export default createRouter()
    .openapi(createRoute({
        method: "get",
        tags: ["Index"],
        path: "/",
        responses: {
            [OK]:
                jsonContent(z.object({
                    message: z.string().default("Welcome!")
                }), "Modern Web API - Template")
        }
    }), (c) => { return c.json({ message: "Welcome!" }, OK) })