import { db } from "../db/db.ts";

export async function updateTeamStandings(
    team_id: number,
    goalsFor: number,
    goalsAgainst: number,
    result: "win" | "loss" | "draw",
) {
    // Calculate the points based on the result
    const points = result === "win" ? 3 : (result === "draw" ? 1 : 0);
    const goalDifference = goalsFor - goalsAgainst;

    // First check if the team already has a record in standings
    const [existingStanding] = await db.query(
        `SELECT * FROM standings WHERE team_id = ?`,
        [team_id],
    );

    if (existingStanding) {
        // Update existing record
        await db.query(
            `UPDATE standings SET
                matches_played = matches_played + 1,
                wins = wins + ${result === "win" ? 1 : 0},
                draws = draws + ${result === "draw" ? 1 : 0},
                losses = losses + ${result === "loss" ? 1 : 0},
                points = points + ?,
                goals_for = goals_for + ?,
                goals_against = goals_against + ?,
                goal_difference = goal_difference + ?
            WHERE team_id = ?`,
            [
                points,
                goalsFor,
                goalsAgainst,
                goalDifference,
                team_id,
            ],
        );
    } else {
        // Get team name first (assuming you want to set it on first creation)
        const [team] = await db.query(
            `SELECT name FROM teams WHERE id = ?`,
            [team_id],
        );

        if (!team) {
            throw new Error(`Team with ID ${team_id} not found`);
        }

        // Create new record
        await db.query(
            `INSERT INTO standings (
                team_id, team_name, matches_played, wins, draws, losses,
                points, goals_for, goals_against, goal_difference
            ) VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?)`,
            [
                team_id,
                team.name,
                result === "win" ? 1 : 0,
                result === "draw" ? 1 : 0,
                result === "loss" ? 1 : 0,
                points,
                goalsFor,
                goalsAgainst,
                goalDifference,
            ],
        );
    }
}
