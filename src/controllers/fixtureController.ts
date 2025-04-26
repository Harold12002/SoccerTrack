import { db } from "../db/db.ts";
import { Context } from "../imports.ts";

export class FixtureController {
    //insert fixtures
    async addFixtures(ctx: Context) {
        try {
            if (!ctx.state.user) {
                ctx.response.status = 401;
                ctx.response.body = { message: "Unauthorized." };
                return;
            }

            // Fetch all 20 teams
            const teams = await db.query("SELECT id, name, venue FROM teams");
            if (teams.length !== 20) {
                ctx.response.status = 400;
                ctx.response.body = {
                    message:
                        "Exactly 20 teams are required to generate fixtures.",
                };
                return;
            }

            // Clear previous fixtures
            await db.query("DELETE FROM fixtures");

            // Generate all 380 pairings (same as before)
            const firstHalf: any[] = [];
            const secondHalf: any[] = [];

            for (let i = 0; i < teams.length; i++) {
                for (let j = i + 1; j < teams.length; j++) {
                    firstHalf.push({
                        homeId: teams[i].id,
                        awayId: teams[j].id,
                        venue: teams[i].venue,
                        status: "scheduled",
                    });
                    secondHalf.push({
                        homeId: teams[j].id,
                        awayId: teams[i].id,
                        venue: teams[j].venue,
                        status: "scheduled",
                    });
                }
            }

            // Shuffle fixtures
            const shuffle = (arr: any[]) =>
                [...arr].sort(() => Math.random() - 0.5);
            const allFixtures = shuffle([...firstHalf, ...secondHalf]);

            // Initialize 38 matchdays (weeks)
            const matchdays: any[][] = Array.from({ length: 38 }, () => []);

            // First pass: Try to place fixtures optimally
            for (const fixture of allFixtures) {
                let placed = false;

                for (let week = 0; week < 38 && !placed; week++) {
                    const currentWeek = matchdays[week];

                    // Check for team OR venue conflicts
                    const isConflict = currentWeek.some((f) =>
                        f.homeId === fixture.homeId ||
                        f.awayId === fixture.homeId ||
                        f.homeId === fixture.awayId ||
                        f.awayId === fixture.awayId ||
                        f.venue === fixture.venue // Stadium sharing conflict
                    );

                    if (!isConflict && currentWeek.length < 10) {
                        currentWeek.push(fixture);
                        placed = true;
                    }
                }
            }

            // Second pass: Force-place remaining fixtures (relax rules)
            const unplacedFixtures = allFixtures.filter((f) =>
                !matchdays.flat().some((m) =>
                    m.homeId === f.homeId && m.awayId === f.awayId
                )
            );

            for (const fixture of unplacedFixtures) {
                for (let week = 0; week < 38; week++) {
                    const currentWeek = matchdays[week];
                    if (currentWeek.length < 10) {
                        currentWeek.push(fixture);
                        break;
                    }
                }
            }

            // Assign match dates (Friday/Saturday/Sunday)
            const today = new Date();
            while (today.getDay() !== 5) today.setDate(today.getDate() + 1); // Next Friday
            const currentDate = new Date(today);

            for (let week = 0; week < 38; week++) {
                const friday = new Date(currentDate);
                const saturday = new Date(currentDate);
                const sunday = new Date(currentDate);
                saturday.setDate(friday.getDate() + 1);
                sunday.setDate(friday.getDate() + 2);

                const weekFixtures = matchdays[week];

                // Friday (3 games)
                for (let i = 0; i < 3 && i < weekFixtures.length; i++) {
                    const matchDate = new Date(friday);
                    matchDate.setHours(19, 0, 0, 0); // 7:00 PM
                    weekFixtures[i].match_date = matchDate;
                }

                // Saturday (5 games)
                for (let i = 3; i < 8 && i < weekFixtures.length; i++) {
                    const matchDate = new Date(saturday);
                    matchDate.setHours(12 + (i - 3) * 2, 0, 0, 0); // 12 PM, 2 PM, etc.
                    weekFixtures[i].match_date = matchDate;
                }

                // Sunday (remaining 2 games)
                for (let i = 8; i < weekFixtures.length; i++) {
                    const matchDate = new Date(sunday);
                    matchDate.setHours(15, 0, 0, 0); // 3:00 PM
                    weekFixtures[i].match_date = matchDate;
                }

                currentDate.setDate(currentDate.getDate() + 7); // Next week
            }

            // Insert into database
            let insertedCount = 0;
            for (const week of matchdays) {
                for (const f of week) {
                    await db.query(
                        "INSERT INTO fixtures (home_team_id, away_team_id, match_date, venue, status) VALUES (?, ?, ?, ?, ?)",
                        [f.homeId, f.awayId, f.match_date, f.venue, f.status],
                    );
                    insertedCount++;
                }
            }

            ctx.response.status = 201;
            ctx.response.body = {
                message:
                    `Successfully generated ${insertedCount}/380 fixtures.`,
                details: {
                    fridayGames: 3,
                    saturdayGames: 5,
                    sundayGames: 2,
                },
            };
        } catch (error) {
            console.error("Error:", error);
            ctx.response.status = 500;
            ctx.response.body = { message: "Failed to generate fixtures." };
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
