import Database from "better-sqlite3";
import BetterSqlite3 from "better-sqlite3";

const appDB: BetterSqlite3.Database = new Database(
  process.env.APP_DB_PATH ?? "app.db",
);

// アイテムマスタ登録テーブル
appDB.exec(`
  CREATE TABLE IF NOT EXISTS items(
    item_id INTEGER,
    item_name TEXT PRIMARY KEY,
    item_type TEXT NOT NULL,
    item_stock INTEGER NOT NULL
  )
`);

// 部品入荷履歴登録テーブル
appDB.exec(`
  CREATE TABLE IF NOT EXISTS inputs (
    input_id TEXT PRIMARY KEY,
    item_name TEXT NOT NULL,
    input_date TEXT NOT NULL,
    input_qty INTEGER NOT NULL,
    input_source TEXT NOT NULL
  )
`);

// 行程登録テーブル
appDB.exec(`
  CREATE TABLE IF NOT EXISTS achievements (
    achievement_id TEXT PRIMARY KEY,
    item_name TEXT NOT NULL,
    item_type TEXT NOT NULL,
    achievement_date TEXT NOT NULL,
    achievement_qty INTEGER NOT NULL
  )
`);

appDB.exec(`
  CREATE TABLE IF NOT EXISTS consumes (
  consume_id INTEGER PRIMARY KEY,
    item_name TEXT NOT NULL,
    item_type TEXT NOT NULL,
    achievement_id TEXT NOT NULL
  )
`);

appDB.exec(`
  CREATE TABLE IF NOT EXISTS outputs (
  output_id INTEGER PRIMARY KEY,
    item_name TEXT NOT NULL,
    output_date TEXT NOT NULL,
    output_qty INTEGER NOT NULL,
    output_customer TEXT NOT NULL
  )
`);

export default appDB;
