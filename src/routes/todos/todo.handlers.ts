import { ListRoute } from "./todo.routes";
import { AppRouteHandler } from "@/types";

export const list: AppRouteHandler<ListRoute> = (c) => {
    c.var.logger.info("List of todos");
    return c.json([{ title: "Name of todo", done: false }], 200);
}