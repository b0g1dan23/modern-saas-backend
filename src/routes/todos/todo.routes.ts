import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import jsonContent from '@/helpers/json-content';
import { OK } from '@/helpers/http-status-codes';

export const list = createRoute({
    path: '/todo',
    tags: ["Todos"],
    method: 'get',
    responses: {
        [OK]: jsonContent(z.array(z.object({ title: z.string().default("Name of todo"), done: z.boolean().default(false) })), "List of todos")
    }
})

export type ListRoute = typeof list;
