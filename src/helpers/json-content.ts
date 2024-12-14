import { ZodSchema } from "zod";

const jsonContent = <T extends ZodSchema>(schema: T, desc: string) => {
    return {
        content: {
            "application/json": {
                schema: schema
            }
        },
        description: desc
    }
}

export default jsonContent;