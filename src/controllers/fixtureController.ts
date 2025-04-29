import { db } from "../db/db.ts";
import { Context } from "../imports.ts";

export class FixtureController {
    //add fixtures
    async addFixtures(ctx: Context) {
        try {
            // Auth check
            if (!ctx.state.user) {
                ctx.response.status = 401;
                ctx.response.body = { message: "Unauthorized." };
                return;
            }

            // Fetch teams (strictly enforce 18 teams)
            const teams = await db.query("SELECT id, name, venue FROM teams");
            if (teams.length !== 18) {
                ctx.response.status = 400;
                ctx.response.body = { message: "Exactly 18 teams required." };
                return;
            }

            // Clear old fixtures (handle foreign keys)
            await db.query("SET FOREIGN_KEY_CHECKS = 0");
            await db.query("TRUNCATE TABLE fixtures");
            await db.query("SET FOREIGN_KEY_CHECKS = 1");

            // Generate all 306 home/away fixture pairs
            const allFixtures: any[] = [];
            for (let i = 0; i < teams.length; i++) {
                for (let j = 0; j < teams.length; j++) {
                    if (i !== j) {
                        allFixtures.push({
                            homeId: teams[i].id,
                            awayId: teams[j].id,
                            venue: teams[i].venue,
                            status: "scheduled",
                        });
                    }
                }
            }

            // Shuffle to avoid bias
            const shuffledFixtures = [...allFixtures].sort(() =>
                Math.random() - 0.5
            );

            // Prepare 34 matchdays (weeks), each with up to 9 fixtures
            const matchdays: any[][] = Array.from({ length: 34 }, () => []);

            // Assign fixtures to matchdays (week) avoiding team conflicts
            for (const fixture of shuffledFixtures) {
                let placed = false;

                for (let week = 0; week < 34 && !placed; week++) {
                    const weekFixtures = matchdays[week];

                    const teamConflict = weekFixtures.some(
                        (f) =>
                            f.homeId === fixture.homeId ||
                            f.awayId === fixture.homeId ||
                            f.homeId === fixture.awayId ||
                            f.awayId === fixture.awayId,
                    );

                    if (!teamConflict && weekFixtures.length < 9) {
                        weekFixtures.push(fixture);
                        placed = true;
                    }
                }

                // Force-place if not yet placed (relax constraints)
                if (!placed) {
                    for (let week = 0; week < 34; week++) {
                        const weekFixtures = matchdays[week];
                        if (weekFixtures.length < 9) {
                            // Don't check teamConflict here to force place if absolutely necessary
                            weekFixtures.push(fixture);
                            placed = true;
                            console.warn(
                                `Force-placed fixture: ${fixture.homeId} vs ${fixture.awayId}`,
                            );
                            break;
                        }
                    }
                }

                // Final fallback
                if (!placed) {
                    console.error(
                        `Could not place fixture: ${fixture.homeId} vs ${fixture.awayId}`,
                    );
                }
            }

            // Assign dates: Fridays, Saturdays, Sundays
            const startDate = new Date();
            while (startDate.getDay() !== 5) {
                startDate.setDate(startDate.getDate() + 1); // Start from upcoming Friday
            }

            for (let week = 0; week < 34; week++) {
                const weekStart = new Date(startDate);
                weekStart.setDate(startDate.getDate() + week * 7);

                const fixtures = matchdays[week];

                // Friday (2 matches)
                for (let i = 0; i < 2 && i < fixtures.length; i++) {
                    const matchTime = new Date(weekStart);
                    matchTime.setHours(19 + i, 0, 0, 0);
                    fixtures[i].match_date = matchTime;
                }

                // Saturday (5 matches)
                for (let i = 2; i < 7 && i < fixtures.length; i++) {
                    const matchTime = new Date(weekStart);
                    matchTime.setDate(matchTime.getDate() + 1);
                    matchTime.setHours(12 + (i - 2) * 2, 0, 0, 0);
                    fixtures[i].match_date = matchTime;
                }

                // Sunday (2 matches)
                for (let i = 7; i < fixtures.length; i++) {
                    const matchTime = new Date(weekStart);
                    matchTime.setDate(matchTime.getDate() + 2);
                    matchTime.setHours(15, 0, 0, 0);
                    fixtures[i].match_date = matchTime;
                }
            }

            // Insert fixtures into the database
            let insertedCount = 0;
            for (const week of matchdays) {
                for (const fixture of week) {
                    await db.query(
                        `INSERT INTO fixtures 
                    (home_team_id, away_team_id, match_date, venue, status) 
                    VALUES (?, ?, ?, ?, ?)`,
                        [
                            fixture.homeId,
                            fixture.awayId,
                            fixture.match_date,
                            fixture.venue,
                            fixture.status,
                        ],
                    );
                    insertedCount++;
                }
            }

            // Final check
            ctx.response.status = 201;
            ctx.response.body = {
                message:
                    `Successfully scheduled ${insertedCount}/306 fixtures.`,
                fixturesPerWeek: 9,
                totalWeeks: 34,
            };
        } catch (error) {
            console.error("Fixture generation error:", error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Fixture generation failed." };
        }
    }
    //get all fixtures
    async getAllFixtures(ctx: Context) {
        try {
            const now = new Date().toISOString();
            const result = await db.query(
                `
                SELECT 
                f.id,
                f.match_date,
                f.venue,
                home.name as home_team_name,
                away.name as away_team_name
            FROM fixtures f
            JOIN teams home ON f.home_team_id = home.id
            JOIN teams away ON f.away_team_id = away.id
            WHERE f.match_date > ?
            ORDER BY f.match_date ASC
            `,
                [now],
            );
            if (result.length > 0) {
                ctx.response.status = 200;
                ctx.response.body = { upcoming: result };
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
            SELECT 
                f.id,
                f.match_date,
                f.venue,
                home.name as home_team_name,
                away.name as away_team_name
            FROM fixtures f
            JOIN teams home ON f.home_team_id = home.id
            JOIN teams away ON f.away_team_id = away.id
            WHERE f.match_date > ?
            ORDER BY f.match_date ASC
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
