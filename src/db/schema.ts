import { createId } from "@paralleldrive/cuid2";
import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const todosTable = sqliteTable("todos_table", {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    title: text("title").notNull(),
    done: integer("done", { mode: 'boolean' }),
    createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`(cast((julianday('now') - 2440587.5)*86400000 as integer))`),
    updatedAt: integer("updated_at", { mode: 'timestamp' }).$onUpdate(() => new Date())
});