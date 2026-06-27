import { createConnection } from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env" });

const url = process.env.DATABASE_URL;
if (!url) { console.error("No DATABASE_URL found"); process.exit(1); }

const cleanUrl = url.replace(/[?&]sslmode=[^&]*/g, "");
const conn = await createConnection(cleanUrl + (cleanUrl.includes("?") ? "&" : "?") + "ssl=true");

const [rows] = await conn.execute(
  "SELECT id, name, email, agencyName, agencySize, message, createdAt FROM demo_requests ORDER BY createdAt DESC LIMIT 10"
);
console.log("=== Recent Demo Requests ===");
if (rows.length === 0) {
  console.log("(none found)");
} else {
  rows.forEach(r => console.log(JSON.stringify(r)));
}

const [notifRows] = await conn.execute(
  "SELECT id, recipientEmail, eventType, status, createdAt FROM notification_logs ORDER BY createdAt DESC LIMIT 10"
);
console.log("\n=== Recent Notification Logs ===");
if (notifRows.length === 0) {
  console.log("(none found)");
} else {
  notifRows.forEach(r => console.log(JSON.stringify(r)));
}

await conn.end();
