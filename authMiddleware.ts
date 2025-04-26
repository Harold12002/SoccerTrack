import { createSecretKey } from "./src/helpers/userHelpers.ts";
import { Context, verify } from "./src/imports.ts";

export async function authMiddleware(ctx: Context, next: Function) {
    const authHeader = ctx.request.headers.get("Authorization");

    // Check if the header exists
    if (!authHeader) {
        ctx.response.status = 401;
        ctx.response.body = { error: "Authorization header is missing" };
        return;
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
        ctx.response.status = 401;
        ctx.response.body = { error: "Token is missing" };
        return;
    }

    try {
        const cryptoKey = await createSecretKey();
        const payLoad = await verify(token, cryptoKey);

        // Check the payload for id and role
        if (!payLoad || !payLoad.id) {
            ctx.response.status = 401;
            ctx.response.body = { error: "Invalid token payload" };
            return;
        }

        ctx.state.user = payLoad;
        await next();
    } catch (error) {
        console.error("Token verification error", error);
        ctx.response.status = 401;
        ctx.response.body = { error: "Invalid token" };
    }
}
