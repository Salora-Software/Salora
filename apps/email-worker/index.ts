import {  Redis } from "ioredis";
import {
  sendEmailWithFailover,
  QUEUE_NAME,
  type EmailJobData,
} from "@salora/mailer";

const connection = new Redis(
  process.env.REDIS_URL || "redis://localhost:6379",
);

// @ts-ignore
connection.onconnect = () => {
  console.log("✅ Successfully connected to Redis (Bun)");
};

// @ts-ignore
connection.onclose = (err) => {
  if (err) console.error("❌ Redis connection error:", err);
};

console.log("📧 Email worker with failover running (Bun native)...");

// Worker loop
async function runWorker() {
  while (true) {
    try {
      // BRPOP returns [key, value] or null
      const result = await connection.brpop(QUEUE_NAME, 0);
      if (result && Array.isArray(result) && result.length === 2) {
        const jobData: EmailJobData = JSON.parse(result[1]);
        await sendEmailWithFailover(jobData, connection);
      }
    } catch (error) {
      console.error("❌ Worker loop error:", error);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

runWorker();
