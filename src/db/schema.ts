import { v4 as uuidv4 } from 'uuid';
import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { UserRoles, UserRolesValues } from '$/routes/users/user.types';
import { z } from 'zod';

const timestamps = {
    createdAt: integer("created_at")
        .$defaultFn(() => Date.now()),
    updatedAt: integer("updated_at")
        .$defaultFn(() => Date.now())
        .$onUpdate(() => Date.now())
}

export const usersTable = sqliteTable("users_table", {
    id: text("id", { length: 36 }).primaryKey().$defaultFn(() => uuidv4()),
    role: text({ enum: UserRolesValues }).default(UserRoles.Gost).notNull(),
    ime: text("ime").notNull(),
    prezime: text("prezime").notNull(),
    email: text("email").notNull().unique(),
    email_verified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
    password: text("password"),
    profilna_slika: text("profilna_slika"),
    ...timestamps
}, (table) => ({
    uniqueEmail: uniqueIndex(`unique_user_email`).on(table.email)
}))

export const selectUsersSchema = createSelectSchema(usersTable).omit({ password: true });

export const insertUserSchema = createInsertSchema(usersTable, {
    email: (schema) => schema.email(),
    password: (schema) => schema.min(6).max(100),
})
    .pick({ ime: true, email: true, prezime: true, password: true });

export const updateUserSchema = insertUserSchema.partial();

export const tempVerificationEmailTable = sqliteTable("temp_verification_email", {
    id: text("id", { length: 36 }).primaryKey().$defaultFn(() => uuidv4()),
    userId: text("user_id", { length: 36 }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    expiresOn: integer("expires_on", { mode: "timestamp" }).notNull().$default(() => new Date(Date.now() + 1000 * 60 * 15)),
}, (table) => ({
    uniqueEmail: uniqueIndex(`unique_userID_tempverification`).on(table.userId)
}))

export const selectEmailVerificationSchema = createSelectSchema(tempVerificationEmailTable);

export const resetPasswordTable = sqliteTable("reset_password_table", {
    id: text("id", { length: 36 }).primaryKey().$defaultFn(() => uuidv4()),
    userId: text("user_id", { length: 36 }).notNull().references(() => usersTable.id, { onDelete: "cascade" }),
    expiresOn: integer("expires_on", { mode: "timestamp" }).notNull().$default(() => new Date(Date.now() + 1000 * 60 * 15)),
    ...timestamps,
}, (table) => ({
    uniqueEmail: uniqueIndex(`unique_userID_reset_pw`).on(table.userId)
}))

export const selectResetPasswordSchema = createSelectSchema(resetPasswordTable);

export type User = z.infer<typeof selectUsersSchema>;