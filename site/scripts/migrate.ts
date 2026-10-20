import { loadEnvConfig } from "@next/env";
import { initializeDatabase } from "../lib/db";
import { initializeExcelDatabase } from "../lib/microsoft";

loadEnvConfig(process.cwd());
initializeDatabase()
  .then(()=>initializeExcelDatabase())
  .then(()=>console.log("Muza database schema is ready."))
  .catch(()=>{ console.error("Database migration failed. Verify DATABASE_URL and connectivity."); process.exitCode=1; });
