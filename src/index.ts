import { serve } from "bun";
import app from "./app";
import env from "./env";

const port = env.PORT || 3000;
console.log(`Server running at http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
})