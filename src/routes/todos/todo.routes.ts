import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import jsonContent from '@/helpers/json-content';
import { NO_CONTENT, NOT_FOUND, OK, UNPROCESSABLE_ENTITY } from '@/helpers/http-status-codes';
import { insertTaskSchema, pathTasksSchema, selectTodosSchema } from '@/db/schema';
import jsonContentRequired from '@/helpers/json-content-required';
import createErrorSchema from '@/helpers/create-error-schema';
import IDParamsSchema from '@/helpers/id-params-schema';
import notFoundSchema from '@/helpers/not-found-schema';

const tags = ['Todos'];

export const list = createRoute({
    path: '/todo',
    tags,
    method: 'get',
    responses: {
        [OK]: jsonContent(z.array(selectTodosSchema), "List of todos")
    }
})

export const create = createRoute({
    path: '/todo',
    tags,
    method: 'post',
    request: {
        body: jsonContentRequired(insertTaskSchema, "Task to create"),
    },
    responses: {
        [OK]: jsonContent(selectTodosSchema, "List of todos"),
        [UNPROCESSABLE_ENTITY]: jsonContent(createErrorSchema(insertTaskSchema), "The validation errors")
    }
})

export const getOne = createRoute({
    path: '/todo/{id}',
    tags,
    request: {
        params: IDParamsSchema
    },
    method: 'get',
    responses: {
        [OK]: jsonContent(z.array(selectTodosSchema), "Requested todo"),
        [NOT_FOUND]: notFoundSchema(),
        [UNPROCESSABLE_ENTITY]: jsonContent(createErrorSchema(IDParamsSchema), "Invalid id error")
    }
})

export const patch = createRoute({
    path: '/todo/{id}',
    method: 'patch',
    tags,
    request: {
        params: IDParamsSchema,
        body: jsonContentRequired(pathTasksSchema, "Task to update")
    },
    responses: {
        [OK]: jsonContent(z.array(selectTodosSchema), "Updated todo"),
        [NOT_FOUND]: notFoundSchema(),
        [UNPROCESSABLE_ENTITY]: jsonContent(createErrorSchema(pathTasksSchema), "Invalid entity!")
    }
})

export const remove = createRoute({
    path: '/todo/{id}',
    method: 'delete',
    tags,
    request: {
        params: IDParamsSchema,
    },
    responses: {
        [NO_CONTENT]: {
            description: "Todo removed",
        },
        [NOT_FOUND]: notFoundSchema(),
        [UNPROCESSABLE_ENTITY]: jsonContent(createErrorSchema(IDParamsSchema), "Invalid ID error")
    }
})

export type ListRoute = typeof list;
export type CreateRoute = typeof create;
export type GetOneRoute = typeof getOne;
export type PatchRoute = typeof patch;
export type RemoveRoute = typeof remove;