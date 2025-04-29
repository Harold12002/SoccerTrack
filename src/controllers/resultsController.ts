import { db } from "../db/db.ts";
import { updateStandings } from "../helpers/resultsHelper.ts";
import { Context } from "../imports.ts";

export class ResultsController {
    //add result
    async addResults(ctx: Context) {
        try {
            const body = await ctx.request.body.json();
            // Ensure input is an array
            if (!Array.isArray(body)) {
                ctx.response.status = 400;
                ctx.response.body = {
                    message: "Invalid input. Array of teams expected.",
                };
                return;
            }
            for (const result of body) {
                const { fixture_id, home_goals, away_goals, status } = result;

                if (
                    fixture_id === undefined || home_goals === undefined ||
                    away_goals === undefined || !status
                ) {
                    ctx.response.status = 400;
                    ctx.response.body = { message: "Missing required fields." };
                    return;
                }

                const validStatus = ["completed", "postponed"];
                if (!validStatus.includes(status)) {
                    ctx.response.status = 400;
                    ctx.response.body = { message: "Invalid status value." };
                    return;
                }

                // Get fixture info
                const [fixture] = await db.query(
                    `SELECT home_team_id, away_team_id FROM fixtures WHERE id = ?`,
                    [fixture_id],
                );

                if (!fixture) {
                    ctx.response.status = 404;
                    ctx.response.body = { message: "Fixture not found." };
                    return;
                }

                const home_team_id = fixture.home_team_id;
                const away_team_id = fixture.away_team_id;

                let winner = null;
                if (home_goals > away_goals) {
                    winner = home_team_id;
                } else if (away_goals > home_goals) {
                    winner = away_team_id;
                }

                // Save result
                await db.query(
                    `
            INSERT INTO results (
                fixture_id, home_team_id, away_team_id, home_goals, away_goals, status, winner
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
                    [
                        fixture_id,
                        home_team_id,
                        away_team_id,
                        home_goals,
                        away_goals,
                        status,
                        winner,
                    ],
                );
                //update standings
                await updateStandings(
                    home_team_id,
                    away_team_id,
                    home_goals,
                    away_goals,
                );
            }

            ctx.response.status = 201;
            ctx.response.body = { message: "Result recorded." };
        } catch (error) {
            console.error("Error saving result:", error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
    //get all results
    async getAllResults(ctx: Context) {
        try {
            const result = await db.query(`
                SELECT 
    r.id,
    home.name AS home_team_name,
    away.name AS away_team_name,
    r.home_goals,
    r.away_goals
FROM results r
JOIN teams home ON r.home_team_id = home.id
JOIN teams away ON r.away_team_id = away.id
ORDER BY r.id DESC
;
`);
            if (result.length > 0) {
                ctx.response.status = 200;
                ctx.response.body = { results: result };
            } else {
                ctx.response.status = 404;
                ctx.response.body = { message: "No results found" };
            }
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
    //get results by team
    async getResultsByTeam(ctx: any) {
        try {
            const id = ctx.params.id;
            const result = await db.query(
                `
                SELECT * FROM results WHERE id = ?`,
                [id],
            );
            if (result.length > 0) {
                ctx.response.status = 200;
                ctx.response.body = { RESULTS: result };
            } else {
                ctx.response.status = 404;
                ctx.response.body = { message: "No results found" };
            }
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error" };
        }
    }
    //get latest results
    async latestResults(ctx: Context) {
        try {
            const now = new Date().toDateString();
            const result = await db.query(
                `
                SELECT * FROM results WHERE created_at > ? ORDER BY created_at ASC LIMIT 5`,
                [now],
            );
            ctx.response.status = 200;
            ctx.response.body = { RESULTS: result };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
}
