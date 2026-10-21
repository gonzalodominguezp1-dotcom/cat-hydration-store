import { db } from "../src/server/db";
import { syncInventory } from "../src/server/suppliers/inventory-sync-service";

/** Syncs stock and costs for every active supplier (cron-friendly). */
async function main() {
  const suppliers = await db.supplier.findMany({ where: { active: true } });
  for (const s of suppliers) console.log(s.code, await syncInventory(s.id));
}

main().finally(() => db.$disconnect());
