import Database from "better-sqlite3";
import BetterSqlite3 from "better-sqlite3";

const masterDB: BetterSqlite3.Database = new Database(
  process.env.MASTER_DB_PATH ?? "master.db",
);

masterDB.exec(`
  CREATE TABLE IF NOT EXISTS parts(
    part_id TEXT PRIMARY KEY,
    item_name TEXT NOT NULL UNIQUE,
    item_type TEXT NOT NULL
  )
`);

// BOMマスタ登録テーブル
masterDB.exec(`
  CREATE TABLE IF NOT EXISTS boms(
    bom_id TEXT PRIMARY KEY,
    item_name TEXT NOT NULL UNIQUE,
    bom_name TEXT NOT NULL,
    bom_description TEXT NOT NULL
  )
`);

masterDB.exec(`
  CREATE TABLE IF NOT EXISTS bomparts(
    bom_id TEXT NOT NULL,
    item_name TEXT NOT NULL, 
    item_qty INTEGER NOT NULL,
    PRIMARY KEY (bom_id, item_name)
  )
`);

export default masterDB;
