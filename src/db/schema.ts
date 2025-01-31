import { v4 as uuidv4 } from 'uuid';
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from 'zod';

export const usersTable = sqliteTable("users_table", {
    id: text("id", { length: 36 }).primaryKey().$defaultFn(() => uuidv4()),
    role: text({ enum: ['guest', 'owner', 'admin'] }).default('guest').notNull(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    email_verified: integer("email_verified", { mode: "boolean" }).default(false),
    password: text("password"),
    createdAt: integer("created_at")
        .$defaultFn(() => Date.now()),
    updatedAt: integer("updated_at")
        .$defaultFn(() => Date.now())
        .$onUpdate(() => Date.now())
})

export const selectUsersSchema = createSelectSchema(usersTable).omit({ password: true });

export type User = z.infer<typeof selectUsersSchema>;

export const insertUserSchema = createInsertSchema(usersTable, {
    email: (schema) => schema.email(),
    password: (schema) => schema.min(6).max(100),
})
    .required({ name: true, email: true, password: true })
    .omit({ id: true, role: true, createdAt: true, updatedAt: true });

export const updateUserSchema = insertUserSchema.partial();

export const tempVerificationEmailTable = sqliteTable("temp_verification_email", {
    id: text("id", { length: 36 }).primaryKey().$defaultFn(() => uuidv4()),
    userId: text("user_id", { length: 36 }).notNull().unique().references(() => usersTable.id),
    expiresOn: integer("expires_on", { mode: "timestamp" }).notNull().$default(() => new Date(Date.now() + 1000 * 60 * 15)),
})

export const selectEmailVerificationSchema = createSelectSchema(tempVerificationEmailTable);