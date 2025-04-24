import { Client, load } from "../imports.ts";

const env = await load();

export const db = await new Client().connect({
    hostname: env.DB_HOST,
    username: env.DB_USER,
    db: env.DB_NAME,
    password: env.DB_PASS,
    port: Number(env.DB_PORT),
});
