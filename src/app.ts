import { config } from 'dotenv';
import { expand } from 'dotenv-expand';
import { createApp } from './lib/create-app';
import configureOpenAPI from './lib/configure-open-api';
import index from './routes/index.route';
import usersRouter from './routes/users/users.index'

expand(config());

const app = createApp();

const routes = [
    index,
    usersRouter
]

configureOpenAPI(app);
routes.forEach(route => app.route("/api/v1/", route));

app.get('/', c => {
    return c.json({ message: 'Hello, World!' }, 200);
})

export default app;