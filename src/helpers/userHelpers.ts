import { db } from "../db/db.ts";
import { compare, Context, create, hash, verify } from "../imports.ts";

//function to hash password
export async function hashPassword(password: string) {
    return await hash(password);
}
//secret key function
export async function createSecretKey() {
    const JWT_SECRET = "your-secret-key";
    return await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(JWT_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"],
    );
}
//function to create role
export function roleMiddleware(requiredRole: string[]) {
    return async (ctx: Context, next: Function) => {
        const user = ctx.state.user;

        if (!user || !requiredRole.includes(user.role)) {
            ctx.response.status = 403;
            ctx.response.body = {
                error: "You are unauthorized to perform this action.",
            };
            return;
        }
        await next();
    };
}
//function to generate jwt
export async function generateToken(
    id: number,
    username: string,
    role: string,
) {
    const payLoad = {
        username,
        id,
        role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60, //valid for 1hr
    };

    const cryptoKey = await createSecretKey();
    return await create({ alg: "HS256", typ: "JWT" }, payLoad, cryptoKey);
}
//function to verify token
export async function verifyToken(token: string) {
    try {
        const cryptoKey = await createSecretKey();
        const payLoad = await verify(token, cryptoKey);
        return { valid: true, payLoad };
    } catch (error) {
        console.error(`Token verification error`, error);
        return { valid: false };
    }
}
//function to compare passwords
export async function comparePassword(
    password: string,
    hashedPassword: string,
) {
    return await compare(password, hashedPassword);
}

//function to get user by id
export async function getUserById(
    id: number,
) {
    try {
        const result = await db.execute(
            `
            SELECT * FROM users WHERE id = ?`,
            [id],
        );
        if (result) {
            return result;
        }
        return null;
    } catch (error) {
        console.error("Error getting user", error);
    }
}
