import BetterSqlite3 from "better-sqlite3";

class PrimaryIdCreater {
  createId(db: BetterSqlite3.Database, idColumn = "item_name", tableName = "items"): string {
    let id = "";
    for (let i = 0; i < 16; i++) {
      id += Math.floor(Math.random() * 16).toString(16);
    }

    if (db.prepare(`SELECT * FROM ${tableName} WHERE ${idColumn} = ?`).get(id)) {
      return this.createId(db, idColumn, tableName); // 再帰的に新しいIDを生成
    }

    return id;
  }
}

export default new PrimaryIdCreater;