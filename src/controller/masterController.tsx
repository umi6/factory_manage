import masterDB from "../config/master_db.js";
import appDB from "../config/db.js";
import primaryIdCreater from "../config/primaryIdCreater.js";
import ic from "../controller/itemController.tsx";
const { getRequireItemsFromBomId } = ic;
import type { Request, Response } from "express";

const ITEM_TYPES = ["part", "intermediate", "product"] as const;
type ItemType = (typeof ITEM_TYPES)[number];

const isItemType = (value: string): value is ItemType => {
  return (ITEM_TYPES as readonly string[]).includes(value);
};

const addPart = (req: Request, res: Response) => {
  const item_name = req.query.item_name as string | undefined;
  const item_type = req.query.item_type as string | undefined;

  if (!item_name || !item_type) {
    return res
      .status(400)
      .json({ error: "必要なクエリが含まれていません: item_name, item_type" });
  }

  try {
    const part_id = primaryIdCreater.createId(masterDB, "part_id", "parts");
    const stmt = masterDB.prepare(
      `INSERT INTO parts (part_id, item_name, item_type) VALUES (?, ?, ?)`,
    );
    const result = stmt.run(part_id, item_name, item_type);

    res.status(201).json({ message: "部品が登録されました", result });
  } catch (err: any) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({ error: "同じ部品名は既に存在しています" });
    } else {
      console.error("DB登録エラー:", err);
      res.status(500).json({ error: "DB登録に失敗しました" });
    }
  }
};

const updatePart = (req: Request, res: Response) => {
  const part_id = req.query.part_id as string | undefined;
  const item_name = req.query.item_name as string | undefined;
  const item_type = req.query.item_type as string | undefined;

  if (!part_id)
    return res
      .status(400)
      .json({ error: "必要なクエリが含まれていません: part_id" });
  if (!item_name && !item_type) {
    return res.status(400).json({ error: "更新する情報がありません" });
  }

  let oldname: string = "";

  try {
    const setClauses: string[] = [];
    const params: string[] = [];
    if (item_name) {
      const isNameUsed = masterDB
        .prepare(`SELECT part_id FROM parts WHERE item_name = ?`)
        .get(item_name) as { part_id: string } | undefined;
      if (isNameUsed)
        return res
          .status(400)
          .json({ error: "同じ部品名は既に存在しています" });
      const row = masterDB
        .prepare(`SELECT item_name FROM parts WHERE part_id = ?`)
        .get(part_id) as { item_name: string } | undefined;
      if (row) oldname = row.item_name;
      else return res.status(400).json({ error: "何かが...おかしい...?" });

      setClauses.push("item_name = ?");
      params.push(item_name);
    }
    if (item_type) {
      setClauses.push("item_type = ?");
      params.push(item_type);

      // 元中間品又は完成品であり、BOMが登録されている場合は部品に変更できない
      const row = masterDB
        .prepare(`SELECT item_name, item_type FROM parts WHERE part_id = ?`)
        .get(part_id) as { item_name: string; item_type: string } | undefined;
      if (!row) return res.status(400).json({ error: "何かが...おかしい...?" });
      const oldtype = row.item_type;

      if (
        item_type === "part" &&
        (oldtype === "intermediate" || oldtype === "product")
      ) {
        const row_ = masterDB
          .prepare(`SELECT bom_id FROM boms WHERE item_name = ?`)
          .get(row.item_name) as { bom_id: string } | undefined;
        // 登録されているならお帰り願う
        if (row_)
          return res
            .status(400)
            .json({
              error:
                "BOMが登録されている中間品/完成品のタイプを部品に変更することはできません",
            });
      }
    }
    params.push(part_id);

    const tx = masterDB.transaction(() => {
      masterDB
        .prepare(`UPDATE parts SET ${setClauses.join(", ")} WHERE part_id = ?`)
        .run(...params);

      if (item_name) {
        // 各テーブルの名前を更新する必要がある
        const tables = ["boms", "bomparts"];
        for (const table of tables) {
          masterDB
            .prepare(`UPDATE ${table} SET item_name = ? WHERE item_name = ?`)
            .run(item_name, oldname);
        }
      }
    });

    const tx_2 = appDB.transaction(() => {
      if (item_name) {
        const tables = [
          "items",
          "inputs",
          "outputs",
          "achievements",
          "consumes",
        ];
        for (const table of tables) {
          appDB
            .prepare(`UPDATE ${table} SET item_name = ? WHERE item_name = ?`)
            .run(item_name, oldname);
        }
      }
    });

    // NOTE: masterDBとappDBは別トランザクションのため、
    // tx成功・tx_2失敗の場合は不整合が発生する可能性あり
    tx();
    tx_2();
    res.status(200).json({ message: "部品が更新されました" });
  } catch (err: any) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({ error: "同じ部品名は既に存在しています" });
    } else {
      console.error("DB登録エラー:", err);
      res.status(500).json({ error: "DB登録に失敗しました" });
    }
  }
};

const _deletePartCore = (item_name: string): { status: number; json: {} } => {
  try {
    // 素材として利用されていないかを確認
    const row = masterDB
      .prepare(`SELECT bom_id FROM bomparts WHERE item_name = ?`)
      .all(item_name) as { bom_id: string }[];

    // 利用されていた場合
    if (row.length !== 0) {
      const usedList: string[] = [];
      for (const { bom_id } of row) {
        const name = masterDB
          .prepare(`SELECT bom_name FROM boms WHERE bom_id = ?`)
          .get(bom_id) as { bom_name: string };
        if (!name) return { status: 500, json: { error: "ありえない!" } };
        usedList.push(name.bom_name);
      }
      return {
        status: 400,
        json: {
          error: `この部品は${usedList.join(", ")}の素材として利用されています。`,
        },
      };
    }

    // 部品マスタから削除
    masterDB.prepare(`DELETE FROM parts WHERE item_name = ?`).run(item_name);

    // 完成品とするBOMがあれば削除
    const row2 = masterDB
      .prepare(`SELECT bom_id FROM boms WHERE item_name = ?`)
      .get(item_name) as { bom_id: string };
    if (row2) {
      masterDB.prepare(`DELETE FROM boms WHERE bom_id = ?`).run(row2.bom_id);
    }

    return { status: 200, json: { message: "部品が削除されました" } };
  } catch (err: any) {
    return { status: 500, json: { error: `部品の削除に失敗しました: ${err}` } };
  }
};

const deletePart = (req: Request, res: Response) => {
  const item_name = req.query.item_name as string | undefined;

  if (!item_name) {
    return res
      .status(400)
      .json({ error: "必要なクエリが含まれていません: item_name, item_type" });
  }

  const tx = masterDB.transaction(() => {
    return _deletePartCore(item_name);
  });

  const result = tx();
  return res.status(result.status).json(result.json);
};

const deleteParts = (req: Request, res: Response) => {
  const item_names = req.body.item_names as string[] | undefined;

  if (!item_names || item_names.length === 0) {
    return res
      .status(400)
      .json({ error: "必要なbodyが含まれていません: item_names" });
  }

  const tx = masterDB.transaction(() => {
    for (const item_name of item_names) {
      const result = _deletePartCore(item_name);
      if (result.status !== 200) {
        throw result;
      }
    }
  });

  try {
    tx();
    return res.status(200).json({ message: "部品が削除されました" });
  } catch (result: any) {
    if (result.status && result.json) {
      return res.status(result.status).json(result.json);
    }
    return res.status(500).json({ error: "部品の削除に失敗しました" });
  }
};

const getAllParts = (req: Request, res: Response) => {
  const type = req.query.item_type as string | undefined;
  try {
    let result;
    if (type && isItemType(type)) {
      result = masterDB
        .prepare(
          `SELECT part_id, item_name, item_type FROM parts WHERE item_type = ?`,
        )
        .all(type) as {
          part_id: string;
          item_name: string;
          item_type: string;
        }[];
    } else {
      result = masterDB
        .prepare(`SELECT part_id, item_name, item_type FROM parts`)
        .all() as { part_id: string; item_name: string; item_type: string }[];
    }

    res.status(201).json({ message: "部品を取得しました", result });
  } catch (err: any) {
    console.error("DB登録エラー:", err);
    res.status(500).json({ error: "部品の取得に失敗しました" });
  }
};

const addBom = (req: Request, res: Response) => {
  const { bom_name, item_name, bom_description, items } = req.body;

  if (
    !bom_name ||
    !bom_description ||
    !items ||
    !item_name ||
    Object.keys(items).length === 0
  ) {
    return res.status(400).json({ error: "工程情報が不完全です" });
  }

  try {
    const bom_id = primaryIdCreater.createId(masterDB, "bom_id", "boms");
    const stmt = masterDB.prepare(
      `INSERT INTO boms (bom_id, item_name, bom_name, bom_description) VALUES (?, ?, ?, ?)`,
    );
    const result = stmt.run(bom_id, item_name, bom_name, bom_description);

    // 必要な部品と数を登録
    for (const [item_name, item_qty] of Object.entries(items)) {
      const stmt2 = masterDB.prepare(
        `INSERT INTO bomparts (bom_id, item_name, item_qty) VALUES (?, ?, ?)`,
      );
      stmt2.run(bom_id, item_name, item_qty);
    }

    res.status(201).json({ message: "工程が登録されました", result });
  } catch (err: any) {
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({ error: "同じBOM名は既に存在しています" });
    } else {
      console.error("DB登録エラー:", err);
      res.status(500).json({ error: "DB登録に失敗しました" });
    }
  }
};

const updateBom = (req: Request, res: Response) => {
  const { bom_id, bom_name, item_name, bom_description, items } = req.body;

  try {
    if (!bom_id && !item_name) {
      throw {
        status: 400,
        json: {
          error: "必要な情報がbodyに含まれていません: bom_id | item_name",
        },
      };
    }

    if (!bom_name && !bom_description && !items) {
      throw { status: 400, json: { error: "更新する内容がありません" } };
    }

    const tx = masterDB.transaction(() => {
      // bom_idを確定
      let target_bom_id: string = bom_id;
      if (!target_bom_id) {
        const row = masterDB
          .prepare(`SELECT bom_id FROM boms WHERE item_name = ?`)
          .get(item_name) as { bom_id: string } | undefined;
        if (!row)
          throw { status: 404, json: { error: "BOMが見つかりませんでした" } };
        target_bom_id = row.bom_id;
      }

      // nameとdescriptionの更新
      const params: string[] = [];
      const setClauses: string[] = [];
      if (bom_name) {
        setClauses.push("bom_name = ?");
        params.push(bom_name);
      }
      if (bom_description) {
        setClauses.push("bom_description = ?");
        params.push(bom_description);
      }
      params.push(target_bom_id);
      if (setClauses.length > 0) {
        masterDB
          .prepare(`UPDATE boms SET ${setClauses.join(", ")} WHERE bom_id = ?`)
          .run(...params);
      }

      // req_itemsの更新
      if (items) {
        // 全消し
        masterDB
          .prepare(`DELETE FROM bomparts WHERE bom_id = ?`)
          .run(target_bom_id);
        for (const [item_name, item_qty] of Object.entries(items)) {
          masterDB
            .prepare(
              `INSERT INTO bomparts (bom_id, item_name, item_qty) VALUES (?, ?, ?)`,
            )
            .run(target_bom_id, item_name, item_qty);
        }
      }
    });

    tx();
    res.status(200).json({ message: "工程が更新されました" });
  } catch (result: any) {
    if (result.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(400).json({ error: "同じBOM名は既に存在しています" });
    } else if (result.hasOwnProperty("status")) {
      console.error("DB登録エラー:", result);
      res.status(result.status).json(result.json);
    }
  }
};

const _deleteBomCore = (bom_id: string): { status: number; json: {} } => {
  try {
    masterDB.prepare(`DELETE FROM boms WHERE bom_id = ?`).run(bom_id);
    masterDB.prepare(`DELETE FROM bomparts WHERE bom_id = ?`).run(bom_id);

    return { status: 200, json: { message: "BOMが削除されました" } };
  } catch (err: any) {
    return { status: 500, json: { error: `BOMの削除に失敗しました: ${err}` } };
  }
};

const deleteBom = (req: Request, res: Response) => {
  const item_name = req.query.item_name as string | undefined;
  const bom_id = req.query.bom_id as string | undefined;

  let target_bom_id;

  if (!item_name && !bom_id) {
    return res
      .status(400)
      .json({ error: "必要なクエリが含まれていません: item_name, bom_id" });
  }

  try {
    target_bom_id = bom_id;
    if (!target_bom_id) {
      const row = masterDB
        .prepare(`SELECT bom_id FROM boms WHERE bom_name = ?`)
        .get(item_name) as { bom_id: string } | undefined;

      if (row) {
        target_bom_id = row.bom_id;
      } else {
        return res.status(500).json({ error: `そんな！` });
      }
    }

    const tx = masterDB.transaction((target_bom_id) => {
      return _deleteBomCore(target_bom_id);
    });

    const result = tx(target_bom_id);
    return res.status(result.status).json(result.json);
  } catch (err: any) {
    return res.status(500).json({ error: `BOMの削除に失敗しました: ${err}` });
  }
};

const deleteBoms = (req: Request, res: Response) => {
  const item_names = req.body.item_names as string[] | undefined;
  const bom_ids = req.body.bom_ids as string[] | undefined;

  try {
    let values;
    if (item_names && item_names.length > 0) {
      values = item_names.map((i) => {
        const row = masterDB
          .prepare(`SELECT bom_id FROM boms WHERE bom_name = ?`)
          .get(i) as { bom_id: string } | undefined;

        if (row) {
          return row.bom_id;
        } else {
          throw { status: 404, json: { error: "そんな！" } };
        }
      });
    } else if (bom_ids && bom_ids.length > 0) {
      values = bom_ids;
    } else {
      throw {
        status: 400,
        json: { error: "必要なbodyが含まれていません: item_names, bom_ids" },
      };
    }

    const tx = masterDB.transaction(() => {
      for (const bom_id of values) {
        const result = _deleteBomCore(bom_id);
        if (result.status !== 200) {
          throw result;
        }
      }
    });

    tx();
    return res.status(200).json({ message: "全てのBOMが削除されました" });
  } catch (result: any) {
    return res.status(result.status).json(result.json);
  }
};

const getBom = (req: Request, res: Response) => {
  // bom_nameもしくはitem_nameを受け取りたい
  const bom_name = req.query.bom_name as string | undefined;
  const item_name = req.query.item_name as string | undefined;
  let key_name: string;
  let key_value: string;
  if (bom_name) {
    key_name = "bom_name";
    key_value = bom_name;
  } else if (item_name) {
    key_name = "item_name";
    key_value = item_name;
  } else {
    return res
      .status(400)
      .json({ error: "必要なクエリが含まれていません: bom_name | item_name" });
  }

  try {
    // BOMの取得
    const stmt = masterDB.prepare(
      // key_nameは"bom_name"or"item_name"の2択だから安心してね
      `SELECT bom_id, item_name, bom_name, bom_description FROM boms WHERE ${key_name} = ?`,
    );
    const bom = stmt.get(key_value) as
      | {
        bom_id: string;
        item_name: string;
        bom_name: string;
        bom_description: string;
      }
      | undefined;

    if (!bom) {
      return res.status(400).json({ error: "BOMは登録されていません" });
    }

    type reqItem = { [key: string]: number };
    let result: {
      bom_id: string;
      item_name: string;
      bom_name: string;
      bom_description: string;
      items: reqItem;
    };

    // BOMについて
    // 必要な部品と数を取得
    const stmt_2 = masterDB.prepare(
      `SELECT item_name, item_qty FROM bomparts WHERE bom_id = ?`,
    );
    const reqItems_ = stmt_2.all(bom.bom_id) as {
      item_name: string;
      item_qty: number;
    }[];

    if (reqItems_.length === 0) {
      return res
        .status(400)
        .json({ error: "BOMはあるけど必要な部品がない...そんなばかな" });
    }

    let reqItems: reqItem = {};
    for (const { item_name, item_qty } of reqItems_) {
      reqItems[item_name] = item_qty;
    }

    result = {
      ...bom,
      items: reqItems,
    };

    res.status(200).json({ message: "BOMを取得しました", result });
  } catch (err: any) {
    console.error("getBomエラー:", err);
    res.status(500).json({ error: "BOMの取得に失敗しました" });
  }
};

const getBomTree = (req: Request, res: Response) => {
  // bom_nameもしくはitem_nameを受け取りたい
  const bom_name = req.query.bom_name as string | undefined;
  const item_name = req.query.item_name as string | undefined;
  let key_name: string;
  let key_value: string;
  if (bom_name) {
    key_name = "bom_name";
    key_value = bom_name;
  } else if (item_name) {
    key_name = "item_name";
    key_value = item_name;
  } else {
    return res
      .status(400)
      .json({ error: "必要なクエリが含まれていません: bom_name | item_name" });
  }
  console.log(`key:${key_name}, value:${key_value}`)

  // 部品の場合は無視


  try {
    const stmt = masterDB.prepare(
      // key_nameは"bom_name"or"item_name"の2択だから安心してね
      `SELECT bom_id, item_name, bom_name, bom_description FROM boms WHERE ${key_name} = ?`,
    );
    const bom = stmt.get(key_value) as
      | {
        bom_id: string;
        item_name: string;
        bom_name: string;
        bom_description: string;
      }
      | undefined;
    if (!bom) {
      console.error("BOMが見つかりませんでした");
      return res.status(400).json({ error: "BOMが見つかりませんでした" });
    }
    const result = _getRequireItemsFromBomId(bom.bom_id);
    res.status(200).json({ message: "BOMのTreeを取得しました", result });
  } catch (err: any) {
    console.error("getBomエラー:", err);
    res.status(500).json({ error: "BOMの取得に失敗しました" });
  }
};

type ReqItemType = {
  [key: string]: { qty: number; bom: BomType | undefined };
};
type BomType = {
  bom_id: string;
  bom_name: string;
  bom_description: string;
  req_items: ReqItemType;
};

/**
 *
 * @param bom_id
 * @returns
 * image
 * {
 *    alpha: {
 *      qty: 5
 *      bom: {
 *        bom_id: ...,
 *        bom_name: ...,
 *        bom_description: ...,
 *        req_items: {
 *          beta: {...}
 *          c: {...}
 *        }
 *      }
 *    }
 *    a: {
 *      qty: 10
 *      bom: undefined
 *    }
 *    b: {...}
 * }
 */
const _getRequireItemsFromBomId = (bom_id: string): ReqItemType => {
  const req_items: { [key: string]: number } = getRequireItemsFromBomId(bom_id);
  let result: ReqItemType = {};
  for (const [item_name, item_qty] of Object.entries(req_items)) {
    // 各必要なアイテムについて、部品か中間品かの判別を行う
    const stmt = masterDB.prepare(
      `SELECT item_type FROM parts WHERE item_name = ?`,
    );
    const row = stmt.get(item_name) as { item_type: string } | undefined;
    if (!row) {
      throw new Error(`parts に ${item_name} が見つかりませんでした`);
    }

    const { item_type } = row;

    if (item_type === "part") {
      // 部品の場合
      //req_itemsをundefinedとしてそのまま追加
      result[item_name] = { qty: item_qty, bom: undefined };
    } else if (item_type === "intermediate" || item_type === "product") {
      // 中間品の場合
      // 中間品のbomを取得
      const s = masterDB
        .prepare(
          `SELECT bom_id, bom_name, bom_description FROM boms WHERE item_name = ?`,
        )
        .get(item_name) as
        | { bom_id: string; bom_name: string; bom_description: string }
        | undefined;

      if (!s) {
        throw new Error(`${item_name} のBOMが見つかりませんでした`);
      } else {
        result[item_name] = {
          qty: item_qty,
          bom: {
            bom_id: s.bom_id,
            bom_name: s.bom_name,
            bom_description: s.bom_description,
            req_items: _getRequireItemsFromBomId(s.bom_id),
          },
        };
      }
    } else {
      throw new Error(`未知のitem_type: ${item_name}`);
    }
  }
  return result;
};

const getAllBoms = (req: Request, res: Response) => {
  try {
    // 全BOMの取得
    const stmt = masterDB.prepare(
      `SELECT bom_id, item_name, bom_name, bom_description FROM boms`,
    );
    const allBoms = stmt.all() as {
      bom_id: string;
      item_name: string;
      bom_name: string;
      bom_description: string;
    }[];

    type reqItem = { [key: string]: number };
    let result: {
      bom_id: string;
      item_name: string;
      bom_name: string;
      bom_description: string;
      items: reqItem;
    }[] = [];

    if (allBoms.length === 0) {
      return result;
    }

    // 各BOMについて
    for (const bom of allBoms) {
      // 必要な部品と数を取得
      const stmt_2 = masterDB.prepare(
        `SELECT item_name, item_qty FROM bomparts WHERE bom_id = ?`,
      );
      const reqItems_ = stmt_2.all(bom.bom_id) as {
        item_name: string;
        item_qty: number;
      }[];

      if (reqItems_.length === 0) {
        return res
          .status(400)
          .json({ error: "BOMはあるけど必要な部品がない...そんなばかな" });
      }

      let reqItems: reqItem = {};
      for (const { item_name, item_qty } of reqItems_) {
        reqItems[item_name] = item_qty;
      }
      result.push({
        ...bom,
        items: reqItems,
      });
    }

    res.status(200).json({ message: "bomの一覧を取得しました", result });
  } catch (err: any) {
    console.error("getALlBomsエラー:", err);
    res.status(500).json({ error: "bomの取得に失敗しました" });
  }
};

export default {
  addPart,
  addBom,
  updatePart,
  updateBom,
  getAllParts,
  getAllBoms,
  getBom,
  getBomTree,
  deletePart,
  deleteParts,
  deleteBom,
  deleteBoms,
};

/**
 * bomオブジェクトのイメージ
 * {
 *   （bom_id: "BOMのid（getAllBoms, getBomのみ）"）
 *   bom_name: "BOM名",
 *   bom_description: "BOMの説明",
 *   item_name: "作られる製品の名前"
 *   items: {
 *     item1: 10,
 *     item2: 5
 *   }
 * }
 */
