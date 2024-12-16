import { ZodSchema } from "zod"
import jsonContent from "./json-content"

const jsonContentRequired = <T extends ZodSchema>(schema: T, desc: string) => {
    return { ...jsonContent(schema, desc), required: true }
}

export default jsonContentRequired;