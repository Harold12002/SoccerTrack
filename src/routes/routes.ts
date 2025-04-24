import { authMiddleware } from "../../authMiddleware.ts";
import { EventsController } from "../controllers/eventsController.ts";
import { FixtureController } from "../controllers/fixtureController.ts";
import { MiscController } from "../controllers/miscControllers.ts";
import { PlayersController } from "../controllers/playersController.ts";
import { ResultsController } from "../controllers/resultsController.ts";
import { TeamsController } from "../controllers/teamsController.ts";
import { UserControllers } from "../controllers/userRegistration.ts";
import { Router } from "../imports.ts";

const userControllers = new UserControllers();
const teamControllers = new TeamsController();
const playerControllers = new PlayersController();
const fixtureControllers = new FixtureController();
const resultsControllers = new ResultsController();
const eventsControllers = new EventsController();
const miscControllers = new MiscController();
const router = new Router();

//user routes
router.post("/register", userControllers.handleRegister);
router.post("/login", userControllers.handleLogin);
router.get("/user", authMiddleware, userControllers.getUserInfo);

//teams routes
router.post("/add-teams", authMiddleware, teamControllers.addTeams);
router.get("/all-teams", teamControllers.getAllTeams);
router.get("/teams/:id", teamControllers.getTeamById);

//players routes
router.post("/add-players", authMiddleware, playerControllers.addPlayers);
router.get("/all-players", playerControllers.getAllPlayers);
router.get("/players/:id", playerControllers.getPlayerById);
router.get("/goalkeepers", playerControllers.getGoalKeepers);
router.get("/defenders", playerControllers.getDefenders);
router.get("/midfielders", playerControllers.getMidFielders);
router.get("/forwards", playerControllers.getForwards);

//fixtures routess
router.post("/add-fixtures", authMiddleware, fixtureControllers.addFixtures);
router.get("/all-fixtures", fixtureControllers.getAllFixtures);
router.get("/fixtures/team/:id", fixtureControllers.getFixturesByTeam);
router.get("/fixtures/upcoming", fixtureControllers.getUpcomingFixtures);
router.get("/fixtures/status/:status", fixtureControllers.getFixturesByStatus);
router.get("/fixtures/round/:round", fixtureControllers.getFixturesByRound);
router.get("fixtures/today", fixtureControllers.getTodaysFixtures);

//results routes
router.post("/add-results", resultsControllers.addResults);
router.get("/all-results", resultsControllers.getAllResults);
router.get("/results/team/:id", resultsControllers.getResultsByTeam);
router.get("/results/latest", resultsControllers.latestResults);

//events routes
router.post("/add-events", eventsControllers.addMatchEvent);
router.get("/goal-scorers", eventsControllers.getGoalScorers);
router.get("/top-goal-scorers", eventsControllers.getTopGoalScorers);
router.get("/assisters", eventsControllers.getAssisters);
router.get("/top-assisters", eventsControllers.getTopAssisters);
router.get("/red-cards", eventsControllers.getRedCards);
router.get("/yellow-cards", eventsControllers.getYellowCards);

//misc routes
router.get("/standings", miscControllers.getStandings);

export default router;
