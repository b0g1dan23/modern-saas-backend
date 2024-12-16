import db from "@/db";
import { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from "./todo.routes";
import { AppRouteHandler } from "@/types";
import { todosTable } from "@/db/schema";
import { NO_CONTENT, NOT_FOUND, OK } from "@/helpers/http-status-codes";
import { eq } from "drizzle-orm";

export const list: AppRouteHandler<ListRoute> = async (c) => {
    const todos = await db.query.todosTable.findMany();
    return c.json(todos, OK);
}

export const create: AppRouteHandler<CreateRoute> = async (c) => {
    const todo = c.req.valid("json");
    const [inserted] = await db.insert(todosTable).values(todo).returning();
    return c.json(inserted, OK);
}

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const data = await db.query.todosTable.findFirst({ where: (table, { eq }) => eq(table.id, id) });
    if (data === undefined) {
        return c.json({ message: "Not found!" }, NOT_FOUND);
    }
    return c.json(data, OK);
}

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const updates = c.req.valid("json");
    const updated = await db.update(todosTable).set(updates).where(eq(todosTable.id, id)).returning();

    if (!updated) {
        return c.json({ message: "Not found" }, NOT_FOUND);
    }
    return c.json(updated, OK);
}

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
    const { id } = c.req.valid("param");
    const result = await db.delete(todosTable).where(eq(todosTable.id, id));

    if (result.rowsAffected === 0) {
        return c.json({ message: "Not found" }, NOT_FOUND);
    }
    return c.body(null, NO_CONTENT);
}