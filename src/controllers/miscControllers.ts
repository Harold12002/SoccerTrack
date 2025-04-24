import { db } from "../db/db.ts";
import { Context } from "../imports.ts";

export class MiscController {
    //get stangings
    async getStandings(ctx: Context) {
        try {
            const result = await db.query(
                `SELECT * FROM standings`,
            );
            ctx.response.status = 200;
            ctx.response.body = { Standings: result };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error" };
        }
    }
}
