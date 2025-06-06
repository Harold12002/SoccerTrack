import { Application, oakCors } from "./src/imports.ts";
import routes from "./src/routes/routes.ts";

const PORT = Number(Deno.env.get("PORT")) || 8000;

// Setting up Oak application
const app = new Application();

// Enable CORS for all routes
app.use(oakCors({
    origin: ["http://localhost:8081", "http://10.250.225.47:8081"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
}));

// Router middleware
app.use(routes.routes());
app.use(routes.allowedMethods());

// Default root route
app.use((ctx) => {
    ctx.response.body = "Soccer Track system backend";
});

console.log(`Server running on http://0.0.0.0:${PORT}`);
await app.listen({ hostname: "0.0.0.0", port: PORT });
