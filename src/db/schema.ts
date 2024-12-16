import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

export const todosTable = sqliteTable("todos_table", {
    id: integer("id").primaryKey({ autoIncrement: true }),
    title: text("title")
        .notNull(),
    done: integer("done", { mode: 'boolean' })
        .default(false).notNull(),
    createdAt: integer("created_at")
        .$defaultFn(() => Date.now()),
    updatedAt: integer("updated_at")
        .$defaultFn(() => Date.now())
        .$onUpdate(() => Date.now())
});

export const selectTodosSchema = createSelectSchema(todosTable);

export const insertTaskSchema = createInsertSchema(todosTable, {
    title: (schema) => schema.min(1).max(500),
})
    .required({ done: true })
    .omit({ id: true, createdAt: true, updatedAt: true });

export const pathTasksSchema = insertTaskSchema.partial();