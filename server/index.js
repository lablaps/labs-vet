import { createServer } from "node:http";
import { getDatabasePath, initializeDatabase, readData, resetDatabase, writeData, closeDatabase } from "./database.js";

const port = Number(process.env.LABVET_API_PORT || 4174);
const maxJsonBodySize = 60 * 1024 * 1024;

initializeDatabase();

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);

  if (request.method === "OPTIONS") {
    sendEmpty(response, 204);
    return;
  }

  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      sendJson(response, 200, {
        ok: true,
        database: getDatabasePath(),
        mode: "sqlite",
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/database") {
      sendJson(response, 200, readData());
      return;
    }

    if (request.method === "PUT" && url.pathname === "/api/database") {
      const payload = await readJson(request);
      sendJson(response, 200, writeData(payload));
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/reset") {
      sendJson(response, 200, resetDatabase());
      return;
    }

    sendJson(response, 404, { error: "Endpoint nao encontrado." });
  } catch (error) {
    sendJson(response, 500, { error: error.message || "Falha interna na API." });
  }
});

server.listen(port, "127.0.0.1", () => {
  console.log(`API SQLite do laboratorio em http://127.0.0.1:${port}`);
  console.log(`Banco local: ${getDatabasePath()}`);
});

function sendEmpty(response, status) {
  response.writeHead(status, corsHeaders());
  response.end();
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    ...corsHeaders(),
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > maxJsonBodySize) {
        reject(new Error("Payload muito grande."));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("JSON invalido."));
      }
    });
    request.on("error", reject);
  });
}

function shutdown() {
  closeDatabase();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
