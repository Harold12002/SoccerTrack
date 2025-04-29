import { db } from "../db/db.ts";
import { updateTeamStandings } from "../helpers/resultsHelper.ts";
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
                    message: "Invalid input. Array of results expected.",
                };
                return;
            }

            for (const result of body) {
                const { fixture_id, home_goals, away_goals, status } = result;

                if (
                    fixture_id === undefined ||
                    home_goals === undefined ||
                    away_goals === undefined ||
                    status === undefined
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
                if (status === "completed") {
                    if (home_goals > away_goals) {
                        winner = home_team_id;
                    } else if (away_goals > home_goals) {
                        winner = away_team_id;
                    }
                    // If goals are equal, winner remains null (draw)
                }

                // Save result
                await db.query(
                    `INSERT INTO results (
                    fixture_id, home_team_id, away_team_id, 
                    home_goals, away_goals, status, winner
                ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
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

                // Only update standings if the match is completed
                if (status === "completed") {
                    // Update home team standings
                    await updateTeamStandings(
                        home_team_id,
                        home_goals,
                        away_goals,
                        winner === home_team_id
                            ? "win"
                            : (winner === away_team_id ? "loss" : "draw"),
                    );

                    // Update away team standings
                    await updateTeamStandings(
                        away_team_id,
                        away_goals,
                        home_goals,
                        winner === away_team_id
                            ? "win"
                            : (winner === home_team_id ? "loss" : "draw"),
                    );
                }
            }

            ctx.response.status = 201;
            ctx.response.body = { message: "Results recorded successfully." };
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
    //results with stats
    async getAllResultsWithStats(ctx: Context) {
        try {
            // Get all completed matches
            const matches = await db.query(
                `SELECT 
                f.id, 
                ht.name as home_team_name,
                at.name as away_team_name,
                r.home_goals,
                r.away_goals
             FROM results f
             JOIN teams ht ON f.home_team_id = ht.id
             JOIN teams at ON f.away_team_id = at.id
             JOIN results r ON f.id = r.fixture_id
             WHERE r.status = 'completed'
             `,
            );

            // For each match, get statistics
            const matchesWithStats = await Promise.all(
                matches.map(async (match: any) => {
                    const stats = await db.query(
                        `SELECT 
                        ms.*, 
                        p.name as player_name,
                        t.name as team_name,
                        ap.name as assisted_by_name,
                        sp.name as substituted_for_name
                     FROM match_stats ms
                     JOIN players p ON ms.player_id = p.id
                     JOIN teams t ON ms.team_id = t.id
                     LEFT JOIN players ap ON ms.assisted_by = ap.id
                     LEFT JOIN players sp ON ms.substituted_for = sp.id
                     WHERE ms.fixture_id = ?
                     ORDER BY ms.minute ASC`,
                        [match.id],
                    );
                    return {
                        ...match,
                        statistics: stats,
                    };
                }),
            );

            ctx.response.status = 200;
            ctx.response.body = {
                results: matchesWithStats,
            };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
}
