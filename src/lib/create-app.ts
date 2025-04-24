import onError from "$/middlewares/error-handler";
import notFound from "$/middlewares/not-found";
import custom_logger from "$/middlewares/pino-logger";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { AppBindings } from "$/types";
import defaultHook from "./defaultHook";

export function createRouter() {
    return new OpenAPIHono<AppBindings>({ strict: false, defaultHook: defaultHook })
}

export function createApp() {
    const app = new OpenAPIHono<AppBindings>({ strict: false });

    app.use(custom_logger());

    app.notFound(notFound);
    app.onError(onError);
    return app;
}

export function createTestApp(router: OpenAPIHono<AppBindings>) {
    const testApp = createApp();
    testApp.route("/", router);
    return testApp;
}