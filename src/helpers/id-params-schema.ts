import { z } from "zod";

const IDParamsSchema = z.object({
    id: z.coerce.number().openapi({
        param: {
            name: "id",
            in: "path",
            required: true,
        },
        required: ['id'],
        example: 42
    })
})

export default IDParamsSchema;