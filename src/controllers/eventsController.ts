import { db } from "../db/db.ts";
import { Context } from "../imports.ts";

export class EventsController {
    //add match events
    async addMatchEvent(ctx: Context) {
        try {
            if (!ctx.state.user) {
                ctx.response.status = 401;
                ctx.response.body = { message: "Unauthorized. Please login." };
                return;
            }

            const {
                fixture_id,
                player_id,
                team_id,
                event_type,
                minute,
                assisted_by,
                substituted_for,
            } = await ctx.request.body.json();

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
                minute == null
            ) {
                ctx.response.status = 400;
                ctx.response.body = { message: "Missing required fields." };
                return;
            }

            if (!validEvents.includes(event_type)) {
                ctx.response.status = 400;
                ctx.response.body = { message: "Invalid event_type." };
                return;
            }

            // Insert into match_stats
            await db.query(
                `
            INSERT INTO match_stats (
                fixture_id, player_id, team_id, event_type, minute, assisted_by, substituted_for
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
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

            ctx.response.status = 201;
            ctx.response.body = { message: "Match event recorded." };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error." };
        }
    }
    //get all top goal scores
    //get top goal scorer
    //oget top 5 goal scores
    //get all assisters
    //get top assister
    //get top 5 assisters
    //get all red cards
    //get top red cards
    //get all yellow cards
    //get top yellow cards
}
