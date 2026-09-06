const https = require("https");

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing env vars");
  process.exit(1);
}

const users = [
  { email: "namnv@radiotest.vn", password: "TestPassword123!" },
  { email: "kieng@radiotest.vn", password: "TestPassword123!" },
  { email: "trungh@radiotest.vn", password: "TestPassword123!" },
];

async function createUser(email, password) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ email, password, email_confirm: true });
    const url = new URL(SUPABASE_URL);
    
    const options = {
      hostname: url.hostname,
      path: "/auth/v1/admin/users",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(body));
        } else {
          reject(new Error(`${res.statusCode}: ${body}`));
        }
      });
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function migrate() {
  console.log("Starting migration...\n");
  for (const user of users) {
    try {
      console.log(`Creating: ${user.email}`);
      await createUser(user.email, user.password);
      console.log(`  ? Success\n`);
    } catch (err) {
      console.log(`  ? Error: ${err.message}\n`);
    }
  }
  console.log("? Done!");
}

migrate();
