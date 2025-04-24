import { db } from "../db/db.ts";
import {
    comparePassword,
    generateToken,
    hashPassword,
} from "../helpers/userHelpers.ts";
import { Context, UserAgent } from "../imports.ts";

export class UserControllers {
    //register users
    async handleRegister(ctx: Context) {
        try {
            const body = await ctx.request.body.json();
            const { username, email, password, team } = body;

            //validate input
            if (!username || !email || !password || !team) {
                ctx.response.status = 401;
                ctx.response.body = { message: "All fields are required" };
                return;
            }

            //checking if user exists AND username is not taken
            const result = await db.query(
                `SELECT * FROM users WHERE username = ?`,
                [username],
            );
            if (result.length > 0) {
                ctx.response.status = 401;
                ctx.response.body = { message: "Username already taken" };
                return;
            }

            //validating email
            if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                ctx.response.status = 400;
                ctx.response.body = { error: "Invalid email" };
                return;
            }

            //validate password
            const minLength = 8;
            const maxLength = 64;

            if (password.length < minLength || password.length > maxLength) {
                ctx.response.status = 400;
                ctx.response.body = {
                    message: "Password must be between 8 and 64 characters. ",
                };
                return;
            }
            //Check for lowercase, uppercase,digit and special character
            const uppercase = /[A-Z]/.test(password);
            const lowercase = /[a-z]/.test(password);
            const digit = /\d/.test(password);
            const specialChar = /[!@#$%^&*()_\-=+<>?]/.test(password);

            if (!uppercase || !lowercase || !digit || !specialChar) {
                ctx.response.status = 400;
                ctx.response.body = {
                    message:
                        "Password must include uppercase, lowercase, digit and a special character. ",
                };
                return;
            }
            //hash password
            const hashedPassword = await hashPassword(password);

            //insert user into db
            await db.execute(
                `INSERT INTO users (username, email, password, team) VALUES (?, ?, ?, ?)`,
                [
                    username,
                    email,
                    hashedPassword,
                    team,
                ],
            );
            ctx.response.status = 201;
            ctx.response.body = "User registered successfully";
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { error: "Internal server error" };
        }
    }
    //login users
    async handleLogin(ctx: Context) {
        try {
            const body = await ctx.request.body.json();
            const { username, password } = body;
            const userAgentString = ctx.request.headers.get("User-Agent");
            const ua = new UserAgent(userAgentString);

            //validate input
            if (!username || !password) {
                ctx.response.status = 400;
                ctx.response.body = { message: "All fields are required" };
                return;
            }

            //check if user exits and username is correct
            const result = await db.query(
                `SELECT * FROM users WHERE username = ?`,
                [username],
            );

            if (!result || result.length === 0) {
                ctx.response.status = 404;
                ctx.response.body = {
                    message: "User not found or incorrect username",
                };
                return;
            }

            //verify password
            const user = result[0];
            const isPasswordValid = await comparePassword(
                password,
                user.password,
            );

            await db.execute(
                `
                INSERT INTO logins (user_id , username , success, user_agent) VALUES(?,?,?,?)`,
                [
                    user.id,
                    username,
                    isPasswordValid ? 1 : 0,
                    JSON.stringify(ua),
                ],
            );

            if (!isPasswordValid) {
                ctx.response.status = 401;
                ctx.response.body = { error: "Invalid Credentials" };
                return;
            }

            //generate a jwt token
            const token = await generateToken(
                user.id,
                user.username,
                user.role,
            );

            //respond with token
            ctx.response.status = 200;
            ctx.response.body = { token };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error" };
        }
    }
    //user information
    async getUserInfo(ctx: Context) {
        try {
            const userId = ctx.state.user.id;
            const result = await db.query(
                `SELECT id, username, email, team FROM users WHERE id = ?`,
                [userId],
            );
            //check if user exists
            if (!result || result.length === 0) {
                ctx.response.status = 404;
                ctx.response.body = { message: "User not found" };
                return;
            }
            const user = result[0];
            ctx.response.status = 200;
            ctx.response.body = user;
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal Server Error." };
        }
    }
}
