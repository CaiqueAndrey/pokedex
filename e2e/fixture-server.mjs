// Local stand-in for the PokeAPI, serving the recorded fixtures. E2E never calls the real API.
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

const data = JSON.parse(
  readFileSync(new URL("../src/server/pokeapi/fixtures/pokeapi.json", import.meta.url), "utf8"),
);
const PORT = Number(process.env.FIXTURE_PORT ?? 4010);

createServer((request, response) => {
  const { pathname } = new URL(request.url ?? "/", `http://localhost:${PORT}`);
  const key = pathname.replace(/^\/api\/v2/, "").replace(/\/$/, "");
  const body = data[key];
  response.setHeader("content-type", "application/json");
  if (body === undefined) {
    response.statusCode = 404;
    response.end(JSON.stringify({ detail: "Not found" }));
    return;
  }
  response.end(JSON.stringify(body));
}).listen(PORT, () => console.error(`Fixture PokeAPI on :${PORT}`));
