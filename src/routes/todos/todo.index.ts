import { createRouter } from "@/lib/create-app";
import * as handlers from './todo.handlers'
import * as routes from './todo.routes'

const router = createRouter().openapi(routes.list, handlers.list);

export default router;