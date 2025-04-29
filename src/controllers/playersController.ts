import { db } from "../db/db.ts";
import { Context } from "../imports.ts";

export class PlayersController {
    //add players
    async addPlayers(ctx: Context) {
        try {
            if (!ctx.state.user) {
                ctx.response.status = 400;
                ctx.response.body = {
                    message: "Access denied. Please login to add team.",
                };
                return;
            }

            const body = await ctx.request.body.json();

            //ensure input is array
            if (!Array.isArray(body)) {
                ctx.response.status = 400;
                ctx.response.body = {
                    message: "Invalid input. Array of players expected.",
                };
                return;
            }
            for (const player of body) {
                let {
                    team_id,
                    name,
                    position,
                    jersey_number,
                    role,
                } = player;

                // Basic required fields
                if (!team_id || !name || !position || !jersey_number) {
                    ctx.response.status = 400;
                    ctx.response.body = {
                        message: "Invalid input. All fileds required.",
                    };
                    return;
                }

                // Validate ENUMs
                const validPositions = ["GK", "DF", "MF", "FW"];
                const validRoles = ["player", "captain", "vice_captain"];

                if (!validPositions.includes(position)) {
                    ctx.response.status = 400;
                    ctx.response.body = { message: "Invalid position." };
                    return;
                }

                if (!role) role = "player";
                if (!validRoles.includes(role)) {
                    ctx.response.status = 400;
                    ctx.response.body = { message: "Invalid role." };
                    return;
                }

                // Check if player already exists in team
                const existing = await db.query(
                    "SELECT * FROM players WHERE team_id = ? AND name = ?",
                    [team_id, name],
                );
                if (existing.length > 0) {
                    ctx.response.status = 400;
                    ctx.response.body = { message: "Player already added." };
                    return;
                }

                // Insert player
                await db.query(
                    "INSERT INTO players (team_id, name, position, jersey_number, role) VALUES (?,?,?,?,?)",
                    [team_id, name, position, jersey_number, role],
                );
            }
            ctx.response.status = 201;
            ctx.response.body = { message: "Player added successfully." };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
    // get all players
    async getAllPlayers(ctx: Context) {
        try {
            const result = await db.query(`SELECT * FROM players`);
            if (result.length > 0) {
                ctx.response.status = 200;
                ctx.response.body = { Players: result };
            }
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
    //get players by id
    async getPlayerById(ctx: any) {
        try {
            const { id } = ctx.params;
            const result = await db.query(
                `SELECT * FROM players WHERE id = ?`,
                [
                    id,
                ],
            );
            if (result.length > 0) {
                ctx.response.status = 200;
                ctx.response.body = { data: result };
            } else {
                ctx.response.status = 404;
                ctx.response.body = {
                    message: `Player with ID ${id} not found`,
                };
            }
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error" };
        }
    }
    //get players by GK
    async getGoalKeepers(ctx: Context) {
        try {
            const result = await db.query(
                `SELECT * FROM players WHERE position = 'GK'`,
            );
            if (result.length > 0) {
                ctx.response.status = 200;
                ctx.response.body = { Goalkeepers: result };
            }
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
    //get players by DF
    async getDefenders(ctx: Context) {
        try {
            const result = await db.query(
                `SELECT * FROM players WHERE position = 'DF'`,
            );
            if (result.length > 0) {
                ctx.response.status = 200;
                ctx.response.body = { Defenders: result };
            }
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
    //get players by MF
    async getMidFielders(ctx: Context) {
        try {
            const result = await db.query(
                `SELECT * FROM players WHERE position = 'MF'`,
            );
            if (result.length > 0) {
                ctx.response.status = 200;
                ctx.response.body = { Midfielders: result };
            }
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
    //get players by FW
    async getForwards(ctx: Context) {
        try {
            const result = await db.query(
                `SELECT * FROM players WHERE position = 'FW'`,
            );
            if (result.length > 0) {
                ctx.response.status = 200;
                ctx.response.body = { Forwards: result };
            }
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
}
