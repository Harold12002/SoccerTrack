import { db } from "../db/db.ts";

export async function updateStandings(
    homeTeamId: number,
    awayTeamId: number,
    homeGoals: number,
    awayGoals: number,
) {
    // Home team logic
    const homeWin = homeGoals > awayGoals;
    const draw = homeGoals === awayGoals;
    const homeLoss = homeGoals < awayGoals;

    const homePoints = homeWin ? 3 : draw ? 1 : 0;
    const homeGD = homeGoals - awayGoals;

    await db.query(
        `
        UPDATE standings SET
            MP = MP + 1,
            W = W + ?,
            D = D + ?,
            L = L + ?,
            GF = GF + ?,
            GA = GA + ?,
            gd = gd + ?,
            Pts = Pts + ?,
            updated_at = NOW()
        WHERE team_id = ?
    `,
        [
            homeWin ? 1 : 0,
            draw ? 1 : 0,
            homeLoss ? 1 : 0,
            homeGoals,
            awayGoals,
            homeGD,
            homePoints,
            homeTeamId,
        ],
    );

    // Away team logic
    const awayWin = awayGoals > homeGoals;
    const awayLoss = awayGoals < homeGoals;
    const awayPoints = awayWin ? 3 : draw ? 1 : 0;
    const awayGD = awayGoals - homeGoals;

    await db.query(
        `
        UPDATE standings SET
            MP = MP + 1,
            W = W + ?,
            D = D + ?,
            L = L + ?,
            GF = GF + ?,
            GA = GA + ?,
            gd = gd + ?,
            Pts = Pts + ?,
            updated_at = NOW()
        WHERE team_id = ?
    `,
        [
            awayWin ? 1 : 0,
            draw ? 1 : 0,
            awayLoss ? 1 : 0,
            awayGoals,
            homeGoals,
            awayGD,
            awayPoints,
            awayTeamId,
        ],
    );
}
