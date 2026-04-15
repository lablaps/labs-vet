import { getDatabasePath, resetDatabase, closeDatabase } from "../server/database.js";

resetDatabase();
console.log(`Banco SQLite inicializado em ${getDatabasePath()}`);
closeDatabase();
