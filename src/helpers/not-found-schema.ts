import { z } from "zod"
import jsonContent from "./json-content"

const notFoundSchema = () => {
    return jsonContent(z.object({ message: z.string() })
        .openapi({ example: { message: "Not found" } }), "Item not found")
}

export default notFoundSchema;