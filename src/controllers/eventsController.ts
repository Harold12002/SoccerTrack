import { db } from "../db/db.ts";
import { Context } from "../imports.ts";

export class EventsController {
    //add match events
    async addMatchEvent(ctx: Context) {
        try {
            const body = await ctx.request.body.json();
            if (!Array.isArray(body)) {
                ctx.response.status = 400;
                ctx.response.body = {
                    message: "Invalid input. Array of results expected.",
                };
                return;
            }
            for (const event of body) {
                // Parse request body
                const {
                    fixture_id,
                    player_id,
                    team_id,
                    event_type,
                    minute,
                    assisted_by,
                    substituted_for,
                } = event;

                // Basic validation
                const validEvents = [
                    "goal",
                    "assist",
                    "yellow_card",
                    "red_card",
                    "substitution",
                ];

                if (
                    !fixture_id || !player_id || !team_id || !event_type ||
                    minute == null || minute < 0 || minute > 130 // Assuming max match time is 130 mins
                ) {
                    ctx.response.status = 400;
                    ctx.response.body = {
                        message: "Missing required fields or invalid minute.",
                    };
                    return;
                }

                if (!validEvents.includes(event_type)) {
                    ctx.response.status = 400;
                    ctx.response.body = { message: "Invalid event_type." };
                    return;
                }

                // Check if player exists
                const [player] = await db.query(
                    `SELECT id FROM players WHERE id = ?`,
                    [player_id],
                );
                if (!player) {
                    ctx.response.status = 404;
                    ctx.response.body = {
                        message: `Player with id ${player_id} not found.`,
                    };
                    return;
                }

                // Check if team exists
                const [team] = await db.query(
                    `SELECT id FROM teams WHERE id = ?`,
                    [team_id],
                );
                if (!team) {
                    ctx.response.status = 404;
                    ctx.response.body = {
                        message: `Team with id ${team_id} not found.`,
                    };
                    return;
                }

                // Check if fixture exists
                const [fixture] = await db.query(
                    `SELECT id FROM fixtures WHERE id = ?`,
                    [fixture_id],
                );
                if (!fixture) {
                    ctx.response.status = 404;
                    ctx.response.body = {
                        message: `Fixture with id ${fixture_id} not found.`,
                    };
                    return;
                }

                // Validate substitution-specific fields
                if (event_type === "substitution" && !substituted_for) {
                    ctx.response.status = 400;
                    ctx.response.body = {
                        message:
                            "Substitution requires substituted_for player.",
                    };
                    return;
                }

                // Validate assist-specific fields
                if (event_type === "goal" && assisted_by) {
                    // Check if assisting player exists
                    const [assistingPlayer] = await db.query(
                        `SELECT id FROM players WHERE id = ?`,
                        [assisted_by],
                    );
                    if (!assistingPlayer) {
                        ctx.response.status = 404;
                        ctx.response.body = {
                            message:
                                `Assisting player with id ${assisted_by} not found.`,
                        };
                        return;
                    }
                }

                // Insert into match_stats
                await db.query(
                    `INSERT INTO match_stats (
                fixture_id, player_id, team_id, event_type, minute, assisted_by, substituted_for
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [
                        fixture_id,
                        player_id,
                        team_id,
                        event_type,
                        minute,
                        assisted_by || null,
                        substituted_for || null,
                    ],
                );
            }

            ctx.response.status = 201;
            ctx.response.body = {
                message: "Match events recorded successfully.",
            };
        } catch (error) {
            console.error("Error adding match event:", error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
    //get all goal scorers
    async getGoalScorers(ctx: Context) {
        try {
            const result = await db.query(`
                SELECT 
                p.id AS player_id,
                p.name,
                COUNT(e.id) AS goals
            FROM match_events e
            JOIN players p ON e.player_id = p.id
            WHERE e.event_type = 'goal'
            GROUP BY p.id, p.name
            ORDER BY goals DESC`);
            ctx.response.status = 200;
            ctx.response.body = { Scorers: result };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
    //get top 5 goal scorers
    async getTopGoalScorers(ctx: Context) {
        try {
            const result = await db.query(`
                SELECT 
                p.id AS player_id,
                p.name,
                COUNT(e.id) AS goals
            FROM match_events e
            JOIN players p ON e.player_id = p.id
            WHERE e.event_type = 'goal'
            GROUP BY p.id, p.name
            ORDER BY goals DESC 
            LIMIT 5`);
            ctx.response.status = 200;
            ctx.response.body = { Scorers: result };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error" };
        }
    }
    //get all assisters
    async getAssisters(ctx: Context) {
        try {
            const result = await db.query(`
                SELECT 
                p.id AS player_id,
                p.name,
                COUNT(e.id) AS assists 
                FROM match_events e 
                JOIN players p ON e.player_id = p.id 
                WHERE e.event_type = 'assist' 
                GROUP BY p.id, p.name 
                ORDER BY assists DESC
                `);
            ctx.response.status = 200;
            ctx.response.body = { Assits: result };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error" };
        }
    }
    //get top 5 assisters
    async getTopAssisters(ctx: Context) {
        try {
            const result = await db.query(`
                SELECT 
                p.id AS player_id,
                p.name,
                COUNT(e.id) AS assists 
                FROM match_events e 
                JOIN players p ON e.player_id = p.id 
                WHERE e.event_type = 'assist' 
                GROUP BY p.id, p.name 
                ORDER BY assists DESC
                LIMIT 5
                `);
            ctx.response.status = 200;
            ctx.response.body = { Assits: result };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "INternal server error" };
        }
    }
    //get all red cards
    async getRedCards(ctx: Context) {
        try {
            const result = await db.query(`
                SELECT 
                p.id AS player_id,
                p.name,
                COUNT(e.id) AS redCards 
                FROM match_events e 
                JOIN players p ON e.player_id = p.id 
                WHERE e.event_type = 'red_card' 
                GROUP BY p.id, p.name 
                ORDER BY redCards DESC
                `);
            ctx.response.status = 200;
            ctx.response.body = { RedCards: result };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error" };
        }
    }
    //get all yellow cards
    async getYellowCards(ctx: Context) {
        try {
            const result = await db.query(`
            SELECT 
                p.id AS player_id,
                p.name,
                COUNT(e.id) AS yellowCards 
                FROM match_events e 
                JOIN players p ON e.player_id = p.id 
                WHERE e.event_type = 'yellow_card' 
                GROUP BY p.id, p.name 
                ORDER BY redCards DESC
                `);
            ctx.response.status = 500;
            ctx.response.body = { YellowCards: result };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error" };
        }
    }
    // Get match details with statistics
    async getMatchDetails(ctx: any) {
        try {
            const { id } = ctx.params;

            // Get basic match info
            const [match] = await db.query(
                `SELECT * FROM fixtures WHERE id = ?`,
                [id],
            );

            if (!match) {
                ctx.response.status = 404;
                ctx.response.body = { message: "Match not found." };
                return;
            }

            // Get match statistics with player names
            const stats = await db.query(
                `SELECT ms.*, p.name as player_name, t.name as team_name
                 FROM match_stats ms
                 JOIN players p ON ms.player_id = p.id
                 JOIN teams t ON ms.team_id = t.id
                 WHERE ms.fixture_id = ?
                 ORDER BY ms.minute ASC`,
                [id],
            );

            ctx.response.status = 200;
            ctx.response.body = {
                match,
                statistics: stats,
            };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
}
