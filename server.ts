// THE BIG BULL - Unified Next.js + Socket.IO Server
import { createServer } from "http";
import { parse } from "url";
import next from "next";
import os from "os";
import { setupSocketServer } from "./src/server/socket";
import { getStorage } from "./src/server/storage";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

const PORT = parseInt(process.env.PORT || "3000", 10);
const HOST = process.env.HOST || "0.0.0.0";

function getLocalIp(): string {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

async function main() {
  console.log("🐂 Starting THE BIG BULL Competition Server...");
  
  // Initialize storage layer and defaults
  const storage = await getStorage();
  await storage.initialize();

  await app.prepare();

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url || "/", true);
    handle(req, res, parsedUrl);
  });

  // Attach Socket.IO
  setupSocketServer(server);

  server.listen(PORT, HOST, () => {
    const localIp = getLocalIp();
    console.log("\n=======================================================");
    console.log("  🐂  THE BIG BULL - LIVE COMPETITION PLATFORM IS READY");
    console.log("      'Think Smart. Play Strategic. Rule the Bull Market.'");
    console.log("=======================================================");
    console.log(`  🖥️  Admin Dashboard:    http://localhost:${PORT}/admin`);
    console.log(`  📊  Smart Board:        http://localhost:${PORT}/board`);
    console.log(`  📱  Team Join (Local):  http://localhost:${PORT}/join`);
    console.log(`  📶  Team Join (Wi-Fi):  http://${localIp}:${PORT}/join`);
    console.log("=======================================================\n");
  });
}

main().catch((err) => {
  console.error("Fatal server error:", err);
  process.exit(1);
});
