import { execSync } from "node:child_process";

export default function setup() {
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://shop:shop@localhost:5432/shop_test";
  process.env.DATABASE_URL = url;
  execSync("pnpm exec prisma migrate reset --force --skip-seed --skip-generate", {
    stdio: "ignore",
    env: { ...process.env, DATABASE_URL: url, PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: "yes" },
  });
}
