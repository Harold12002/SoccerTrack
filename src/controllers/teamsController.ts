import { db } from "../db/db.ts";
import { Context } from "../imports.ts";

export class TeamsController {
    //add team
    async addTeams(ctx: Context) {
        try {
            if (!ctx.state.user) {
                ctx.response.status = 400;
                ctx.response.body = {
                    message: "Access denied. Please login to add team.",
                };
                return;
            }

            const body = await ctx.request.body.json();

            const {
                name,
                home_stadium,
                coach,
            } = body;

            //validate input
            if (!name || !home_stadium || !coach) {
                ctx.response.status = 400;
                ctx.response.body = {
                    message: "Invalid input. All fields are required.",
                };
                return;
            }

            //checking if team already exists
            const result = await db.query(
                `
                SELECT * FROM TEAMS where name = ?`,
                [name],
            );
            if (result.length > 0) {
                ctx.response.status = 409;
                ctx.response.body = { message: "Team already exist" };
                return;
            }
            await db.execute(
                `
                INSERT INTO teams (name, home_stadium, coach) VALUES (?,?,?)`,
                [
                    name,
                    home_stadium,
                    coach,
                ],
            );
            ctx.response.status = 201;
            ctx.response.body = { message: "Team added successfully" };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
    //get all teams
    async getAllTeams(ctx: Context) {
        try {
            const result = await db.query(`SELECT * FROM teams`);
            if (result.length > 0) {
                ctx.response.status = 200;
                ctx.response.body = { Data: result };
            }
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
    //get team by id
    async getTeamById(ctx: any) {
        try {
            const { id } = ctx.params;
            const result = await db.query(`SELECT * FROM teams WHERE id = ?`, [
                id,
            ]);
            if (result.length > 0) {
                ctx.response.status = 200;
                ctx.response.body = { data: result };
            } else {
                ctx.response.status = 404;
                ctx.response.body = {
                    message: `Team with ID ${id} not found`,
                };
            }
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error" };
        }
    }
}
