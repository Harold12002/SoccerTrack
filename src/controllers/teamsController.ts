import { db } from "../db/db.ts";
import { Context } from "../imports.ts";

export class TeamsController {
    // Add multiple teams
    async addTeams(ctx: Context) {
        try {
            // Check authentication
            if (!ctx.state.user) {
                ctx.response.status = 400;
                ctx.response.body = {
                    message: "Access denied. Please login to add teams.",
                };
                return;
            }

            const body = await ctx.request.body.json();

            // Ensure input is an array
            if (!Array.isArray(body)) {
                ctx.response.status = 400;
                ctx.response.body = {
                    message: "Invalid input. Array of teams expected.",
                };
                return;
            }

            for (const team of body) {
                const { name, venue } = team;

                // Validate each team's data
                if (!name || !venue) {
                    ctx.response.status = 400;
                    ctx.response.body = {
                        message:
                            "Invalid input. Each team must have a name and venue.",
                    };
                    return;
                }

                // Check if team already exists
                const result = await db.query(
                    `SELECT * FROM teams WHERE name = ?`,
                    [name],
                );

                if (result.length > 0) {
                    ctx.response.status = 409;
                    ctx.response.body = {
                        message: `Team '${name}' already exists.`,
                    };
                    return;
                }

                // Insert the new team
                await db.execute(
                    `INSERT INTO teams (name, venue) VALUES (?, ?)`,
                    [name, venue],
                );
            }

            ctx.response.status = 201;
            ctx.response.body = { message: "Teams added successfully." };
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
