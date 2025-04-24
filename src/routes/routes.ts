import { authMiddleware } from "../../authMiddleware.ts";
import { FixtureController } from "../controllers/fixtureController.ts";
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

//fixtures controller
router.post("/add-fixtures", authMiddleware, fixtureControllers.addFixtures);
router.get("/all-fixtures", fixtureControllers.getAllFixtures);
router.get("/fixtures/team/:id", fixtureControllers.getFixturesByTeam);
router.get("/fixtures/upcoming", fixtureControllers.getUpcomingFixtures);
router.get("/fixtures/status/:status", fixtureControllers.getFixturesByStatus);
router.get("/fixtures/round/:round", fixtureControllers.getFixturesByRound);
router.get("fixtures/today", fixtureControllers.getTodaysFixtures);

//results controller
router.post("/add-results", resultsControllers.addResults);
router.get("/all-results", resultsControllers.getAllResults);
router.get("/results/team/:id", resultsControllers.getResultsByTeam);
router.get("/results/latest", resultsControllers.latestResults);

export default router;
