import { db } from "../db/db.ts";
import { Context } from "../imports.ts";

export class FixtureController {
    //insert fixtures
    async addFixtures(ctx: Context) {
        try {
            if (!ctx.state.user) {
                ctx.response.status = 401;
                ctx.response.body = { message: "Access denied. Please login." };
                return;
            }

            //Fetch all 20 teams
            const teams = await db.query("SELECT id, name, venue FROM teams");
            if (teams.length !== 20) {
                ctx.response.status = 400;
                ctx.response.body = {
                    message:
                        "Exactly 20 teams are required to generate fixtures.",
                };
                return;
            }

            // Create unique team pairings home and away

            const firstHalf: any[] = [];
            const secondHalf: any[] = [];

            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    // First half i home, j away
                    firstHalf.push({
                        homeId: teams[i].id,
                        awayId: teams[j].id,
                        venue: teams[i].venue,
                        status: "scheduled",
                    });

                    // Second half j home, i away
                    secondHalf.push({
                        homeId: teams[j].id,
                        awayId: teams[i].id,
                        venue: teams[j].venue,
                        status: "scheduled",
                    });
                }
            }

            // Shuffle both halves
            const shuffle = (arr: any[]) => arr.sort(() => Math.random() - 0.5);
            shuffle(firstHalf);
            shuffle(secondHalf);

            //Combine into 38 matchdays (19 first half, 19 second half)
            const matchdays: any[][] = Array.from({ length: 38 }, () => []);
            const allFixtures = [...firstHalf, ...secondHalf];

            let round = 0;
            for (const fixture of allFixtures) {
                let placed = false;
                while (!placed && round < 38 * 10) {
                    const week = round % 38;
                    const currentWeek = matchdays[week];

                    const isClashing = currentWeek.some((f) =>
                        f.homeId === fixture.homeId ||
                        f.awayId === fixture.homeId ||
                        f.homeId === fixture.awayId ||
                        f.awayId === fixture.awayId
                    );

                    if (!isClashing && currentWeek.length < 10) {
                        currentWeek.push(fixture);
                        placed = true;
                    }

                    round++;
                }
            }

            //Set match dates and time
            const today = new Date();
            while (today.getDay() !== 6) today.setDate(today.getDate() + 1); // Next Saturday
            const currentDate = new Date(today);

            for (let week = 0; week < 38; week++) {
                const saturday = new Date(currentDate);
                const sunday = new Date(currentDate);
                sunday.setDate(saturday.getDate() + 1);

                for (let i = 0; i < 10; i++) {
                    const fixture = matchdays[week][i];
                    const matchDate = new Date(i < 5 ? saturday : sunday);
                    matchDate.setHours(15, 0, 0, 0); // 15:00

                    fixture.match_date = matchDate;
                }

                //next weekend
                currentDate.setDate(currentDate.getDate() + 7);
            }

            //Insert all fixtures
            for (const week of matchdays) {
                for (const f of week) {
                    await db.query(
                        "INSERT INTO fixtures (home_team_id, away_team_id, match_date, venue, status) VALUES (?, ?, ?, ?, ?)",
                        [f.homeId, f.awayId, f.match_date, f.venue, f.status],
                    );
                }
            }

            ctx.response.status = 201;
            ctx.response.body = {
                message: "All fixtures successfully generated and saved.",
            };
        } catch (error) {
            console.error("Error generating fixtures:", error);
            ctx.response.status = 500;
            ctx.response.body = {
                message: "Internal server error.",
            };
        }
    }
    //get all fixtures
    async getAllFixtures(ctx: Context) {
        try {
            const result = await db.query(`
                SELECT * FROM fixtures`);
            if (result.length > 0) {
                ctx.response.status = 200;
                ctx.response.body = { fitures: result };
            } else {
                ctx.response.status = 404;
                ctx.response.body = { message: "No games found" };
            }
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error" };
        }
    }
    //get fixtures by team id
    async getFixturesByTeam(ctx: any) {
        try {
            const id = ctx.params.id;
            const result = await db.query(
                `
            SELECT * FROM fixtures 
            WHERE home_team_id = ? OR away_team_id = ?
            ORDER BY match_date ASC
        `,
                [id, id],
            );

            if (result.length > 0) {
                ctx.response.status = 200;
                ctx.response.body = { fixtures: result };
            } else {
                ctx.response.status = 404;
                ctx.response.body = {
                    message: "No fixtures found for this team.",
                };
            }
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error" };
        }
    }
    //get next 5 games
    async getUpcomingFixtures(ctx: Context) {
        try {
            const now = new Date().toISOString();
            const result = await db.query(
                `
            SELECT * FROM fixtures 
            WHERE match_date > ?
            ORDER BY match_date ASC
            LIMIT 5
        `,
                [now],
            );

            ctx.response.status = 200;
            ctx.response.body = { upcoming: result };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error" };
        }
    }
    // get fixtures by status
    async getFixturesByStatus(ctx: any) {
        try {
            const { status } = ctx.params;
            const validStatus = ["scheduled", "completed", "postponed"];
            if (!validStatus.includes(status)) {
                ctx.response.status = 400;
                ctx.response.body = { message: "Invalid status value." };
                return;
            }

            const result = await db.query(
                `
            SELECT * FROM fixtures 
            WHERE status = ?
            ORDER BY match_date ASC
        `,
                [status],
            );

            ctx.response.status = 200;
            ctx.response.body = { fixtures: result };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error" };
        }
    }
    //get fixtures by matchday
    async getFixturesByRound(ctx: any) {
        try {
            const round = Number(ctx.params.round);
            if (isNaN(round) || round < 1 || round > 38) {
                ctx.response.status = 400;
                ctx.response.body = { message: "Invalid matchday number." };
                return;
            }

            const result = await db.query(
                `
            SELECT * FROM fixtures 
            WHERE round = ?
            ORDER BY match_date ASC
        `,
                [round],
            );

            ctx.response.status = 200;
            ctx.response.body = { fixtures: result };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error" };
        }
    }
    //get todays fixtures
    async getTodaysFixtures(ctx: Context) {
        try {
            const today = new Date();
            const start = new Date(today.setHours(0, 0, 0, 0)).toISOString();
            const end = new Date(today.setHours(23, 59, 59, 999)).toISOString();

            const result = await db.query(
                `
            SELECT * FROM fixtures 
            WHERE match_date BETWEEN ? AND ?
            ORDER BY match_date ASC
        `,
                [start, end],
            );

            ctx.response.status = 200;
            ctx.response.body = { today: result };
        } catch (error) {
            console.error(error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Internal server error" };
        }
    }
}
