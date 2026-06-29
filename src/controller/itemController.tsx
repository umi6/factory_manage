import appDB from "../config/db.tsx";
import masterDB from "../config/master_db.tsx";
import PrimaryIdCreater from "../config/primaryIdCreater.tsx";

type RequireItem = { item_name: string; item_qty: number };

/**
 * @param {string} item_name 入荷したアイテムの名前
 * @param {number} input_qty 入荷したアイテムの数量
 * @param {string} input_date 入荷日
 * @returns
 */
const addInput = (
  item_name: string,
  input_source: string,
  input_qty: number,
  input_date: string,
): string => {
  if (!input_source)
    console.log("私はitemControllerです.input_sourceを渡しなさい");

  const input_id = PrimaryIdCreater.createId(appDB, "input_id", "inputs");
  // 入荷履歴DBに登録
  const stmt = appDB.prepare(
    `INSERT INTO inputs (input_id, input_source, item_name, input_date, input_qty) VALUES (?, ?, ?, ?, ?)`,
  );
  stmt.run(input_id, input_source, item_name, input_date, input_qty);

  // アイテムDBに登録
  const row = appDB
    .prepare(`SELECT item_stock FROM items WHERE item_name = ?`)
    .get(item_name) as { item_stock: number } | undefined;
  // 既に登録されている場合
  if (row) {
    appDB
      .prepare(
        `UPDATE items SET item_stock = item_stock + ? WHERE item_name = ?`,
      )
      .run(input_qty, item_name);
  } else {
    const stmt2 = appDB.prepare(
      `INSERT INTO items (item_name, item_type, item_stock) VALUES (?, ?, ?)`,
    );
    stmt2.run(item_name, "part", input_qty);
  }

  return input_id;
};

const updateInput = (
  input_id: string,
  updateData: { input_date: string; input_qty: number; input_source: string },
) => {
  const tx = appDB.transaction(() => {
    // 日付は容易に変更可能
    if (updateData.input_date) {
      appDB
        .prepare(`UPDATE inputs SET input_date = ? WHERE input_id = ?`)
        .run(updateData.input_date, input_id);
    }

    // 仕入れ元も容易に変更可能
    if (updateData.input_source) {
      appDB
        .prepare(`UPDATE inputs SET input_source = ? WHERE input_id = ?`)
        .run(updateData.input_source, input_id);
    }

    // 入荷量のつじつまが合わなかったらエラーをかえすよ
    if (updateData.input_qty !== undefined) {
      const row_1 = appDB
        .prepare(`SELECT item_name, input_qty FROM inputs WHERE input_id = ?`)
        .get(input_id) as { item_name: string; input_qty: number } | undefined;
      if (!row_1) throw new Error("えぇ？");

      const item_name = row_1.item_name;
      const delta = updateData.input_qty - row_1.input_qty;

      const row_2 = appDB
        .prepare(`SELECT item_stock FROM items WHERE item_name = ?`)
        .get(item_name) as { item_stock: number } | undefined;
      if (!row_2) throw new Error("そんなわけがなくて");

      if (row_2.item_stock + delta < 0) {
        throw new Error("この数に修正したら在庫がマイナスだよ！なにしてんねん");
      }

      // 更新
      appDB
        .prepare(
          `UPDATE items SET item_stock = item_stock + ? WHERE item_name = ?`,
        )
        .run(delta, item_name);

      appDB
        .prepare(`UPDATE inputs SET input_qty = ? WHERE item_name = ?`)
        .run(updateData.input_qty, input_id);
    }
  });

  tx();
};

/**
 * @description 完成品以外選択できないようにして！なんなら在庫ない奴も選択できないようにして！いちおう確認はしてます
 * @param {string} item_name 出荷するアイテム名
 * @param {string} output_date 出荷日
 * @param {number} output_qty 出荷個数
 * @param {string} output_customer 出荷先
 */
const addOutput = (
  item_name: string,
  output_date: string,
  output_qty: number,
  output_customer: string,
) => {
  // 完成品かつ在庫があるか
  const stmt_01 = appDB.prepare(
    `SELECT item_type FROM items WHERE item_name = ? AND item_stock >= ?`,
  );
  const row = stmt_01.get(item_name, output_qty) as
    | { item_type: string }
    | undefined;
  if (!row || row.item_type !== "product") {
    throw new Error("在庫がないので出荷できません");
  }

  const tx = appDB.transaction(() => {
    // 在庫を減少
    const stmt_1 = appDB.prepare(
      `UPDATE items SET item_stock = item_stock - ? WHERE item_name = ?`,
    );
    stmt_1.run(output_qty, item_name);

    // 出荷履歴を登録
    const stmt_2 = appDB.prepare(
      `INSERT INTO outputs (item_name, output_date, output_qty, output_customer) VALUES (?, ?, ?, ?)`,
    );
    stmt_2.run(item_name, output_date, output_qty, output_customer);
  });
  tx();
};

const updateOutput = (
  output_id: string,
  updateData: {
    output_date: string;
    output_qty: number;
    output_customer: string;
  },
) => {
  const tx = appDB.transaction(() => {
    if (updateData.output_date) {
      appDB
        .prepare(`UPDATE outputs SET output_date = ? WHERE output_id = ?`)
        .run(updateData.output_date, output_id);
    }

    if (updateData.output_customer) {
      appDB
        .prepare(`UPDATE outputs SET output_customer = ? WHERE output_id = ?`)
        .run(updateData.output_customer, output_id);
    }

    // 出荷数
    if (updateData.output_qty !== undefined) {
      const new_qty = updateData.output_qty;
      const row_1 = appDB
        .prepare(
          `SELECT item_name, output_qty FROM outputs WHERE output_id = ?`,
        )
        .get(output_id) as { item_name: string; output_qty: number };
      if (!row_1) throw new Error("えぇ？");

      const item_name = row_1.item_name;
      const delta = new_qty - row_1.output_qty;

      const row_2 = appDB
        .prepare(`SELECT item_stock FROM items WHERE item_name = ?`)
        .get(item_name) as { item_stock: number };
      if (!row_2) throw new Error("そんなわけがなくて");

      if (row_2.item_stock - delta < 0)
        throw new Error("この数に修正したら在庫がマイナスだよ！なにしてんねん");

      // 更新
      appDB
        .prepare(
          `UPDATE items SET item_stock = item_stock - ? WHERE item_name = ?`,
        )
        .run(delta, item_name);

      appDB
        .prepare(`UPDATE outputs SET output_qty = ? WHERE output_id = ?`)
        .run(new_qty, output_id);
    }
  });

  tx();
};

/**
 * アイテム名からそのアイテムの在庫を返します
 * @param item_name アイテム名
 * @returns stockの合計と、各入荷/生産日に応じた在庫数
 */
const getItemStock = (item_name: string): number => {
  const item = appDB
    .prepare(`SELECT item_stock FROM items WHERE item_name = ?`)
    .get(item_name) as { item_stock: number };

  //console.log(`${JSON.stringify(item)}`);
  if (item) {
    //console.log("ストックあるよ")
    return item.item_stock;
  } else return 0;
};

/**
 *
 * @param item_name
 * @param achievement_date
 * @param achievement_qty
 * @returns
 */
const addAchievement = (
  item_name: string,
  achievement_date: string,
  achievement_qty: number,
) => {
  // 完成品かどうかの確認（一応）
  const item = masterDB
    .prepare(`SELECT item_type FROM parts WHERE item_name = ?`)
    .get(item_name) as { item_type: string };
  if (
    !item ||
    (item.item_type !== "product" && item.item_type !== "intermediate")
  ) {
    // console.error("完成品または中間品を選択してください"); return
    throw new Error("完成品または中間品を選択してください"); // ← throwに変更
  }

  // 在庫チェックを追加
  if (!isItemMakeable(item_name, achievement_qty)) {
    throw new Error("部品の在庫が足りません"); // ← 追加
  }

  _addAchievement(item_name, item.item_type, achievement_date, achievement_qty);
};

/**
 * @param {string} item_name アイテム名
 * @param {string} item_type アイテムの種類
 * @param {string} achievement_date 行程日
 * @param {number} achievement_qty 行程数量
 * @returns
 */
const _addAchievement = (
  item_name: string,
  item_type: string,
  achievement_date: string,
  achievement_qty: number,
) => {
  if (!isItemMakeable(item_name, achievement_qty)) {
    console.error("部品の在庫が足りません");
    return;
  }

  const tx = appDB.transaction(() => {
    return _addAchievementCore(
      item_name,
      item_type,
      achievement_date,
      achievement_qty,
    );
  });

  try {
    return tx();
  } catch (err) {
    console.error("登録失敗:" + err);
  }
};

/**
 * @private
 * @param {string} item_name アイテム名
 * @param {string} item_type アイテムの種類
 * @param {string} achievement_date 行程日
 * @param {number} achievement_qty 行程数量
 * @returns {string}
 */
const _addAchievementCore = (
  item_name: string,
  item_type: string,
  achievement_date: string,
  achievement_qty: number,
) => {
  const achievement_id = PrimaryIdCreater.createId(
    appDB,
    "achievement_id",
    "achievements",
  );
  // 行程履歴DBに登録
  const stmt = appDB.prepare(
    `INSERT INTO achievements (achievement_id, item_name, item_type, achievement_date, achievement_qty) VALUES (?, ?, ?, ?, ?)`,
  );
  stmt.run(
    achievement_id,
    item_name,
    item_type,
    achievement_date,
    achievement_qty,
  );

  // アイテムDBに登録
  const row = appDB
    .prepare(`SELECT item_stock FROM items WHERE item_name = ?`)
    .get(item_name) as { item_stock: number } | undefined;
  // 既に登録されている場合
  if (row) {
    appDB
      .prepare(
        `UPDATE items SET item_stock = item_stock + ? WHERE item_name = ?`,
      )
      .run(achievement_qty, item_name);
  } else {
    const stmt2 = appDB.prepare(
      `INSERT INTO items (item_name, item_type, item_stock) VALUES (?, ?, ?)`,
    );
    stmt2.run(item_name, item_type, achievement_qty);
  }

  // bomから必要な部品を得る
  const bom_id = getBomIdFromName(item_name);
  const requireItems: { [key: string]: number } =
    getRequireItemsFromBomId(bom_id);

  // nameに加えてtypeもほしい
  const stmt_3 = appDB.prepare(
    `SELECT item_type FROM items WHERE item_name = ?`,
  );

  // 要求される各[中間品/部品]に対して、
  for (const [req_name, req_qty] of Object.entries(requireItems)) {
    const require_qty = req_qty * achievement_qty;
    let itemInfo = stmt_3.get(req_name) as {
      item_type: string;
    };

    if (!itemInfo) {
      // 中間品の可能性を検討
      const raw = masterDB
        .prepare("SELECT item_type FROM parts WHERE item_name = ?")
        .get(req_name) as { part_type: string };
      if (!raw) console.log(`${req_name}は見つからなかったよ...`);

      if (raw.part_type === "intermediate") {
        _addAchievementCore(
          req_name,
          "intermediate",
          achievement_date,
          require_qty,
        );

        itemInfo = stmt_3.get(req_name) as {
          item_type: string;
        };

        if (!itemInfo) {
          console.error("再帰後も在庫なし");
          return false;
        }
      } else {
        console.log(`${req_name}がたりへんね`);
        // console.error("おぉん");
        return false;
      }
    }
    const { item_type: req_type } = itemInfo;
    _consumeRawMaterials(req_name, req_type, require_qty, achievement_id);
  }
};

/**
 * @private
 * @param {string} item_name アイテムID
 * @param {string} item_type
 * @param {integer} qty 消費する数量
 * @param {string} achievement_id 消費の原因となった実績のID
 */
const _consumeRawMaterials = (
  item_name: string,
  item_type: string,
  qty: number,
  achievement_id: string,
) => {
  // item_stockを減らす処理
  const stmt = appDB.prepare(
    `UPDATE items SET item_stock = item_stock - ? WHERE item_name = ?`,
  );
  stmt.run(qty, item_name);

  // 消費履歴に残す処理
  const stmt_2 = appDB.prepare(
    "INSERT INTO consumes (item_name, item_type, achievement_id) VALUES (?, ?, ?)",
  );
  stmt_2.run(item_name, item_type, achievement_id);
};

// 以下はもともとのやつ　その下は，AIさんが直せって言ってきたやつのこぴっぺ
// const isItemMakeable = (item_name: string, item_qty: number = 1): boolean => {
//     //console.log(`${item_name}を${item_qty}個作れるかな？`)
//     const bom_id = getBomIdFromName(item_name);
//     //console.log(`bom_idは${bom_id}だよ`)
//     const stmt = masterDB.prepare(
//         `SELECT item_name, item_qty FROM bomparts WHERE bom_id = ?`,
//     );
//     const requireItems = stmt.all(bom_id) as RequireItem[];
//     //console.log(`材料は${JSON.stringify(requireItems)}だよ`)

//     if (!requireItems || requireItems.length === 0) {
//         console.error("bom_idに紐づく部品/中間品が見つかりません:", bom_id);
//         return false;
//     }

//     // 各部品に対して在庫があるかを探す
//     for (const { item_name: req_name, item_qty: req_qty_ } of requireItems) {
//         const req_qty = item_qty * req_qty_; // 作る[完成品/中間品]の数*1個作成に必要な[部品]の個数
//         //console.log(`${req_name}が${req_qty}個必要だね`)
//         const stmt_2 = appDB.prepare(
//             `SELECT item_type FROM items WHERE item_name = ? AND item_stock >= ?`,
//         );
//         const itemInfo = stmt_2.get(req_name, req_qty);

//         // 在庫がなかった場合
//         if (!itemInfo) {
//             //console.log(`在庫がないよ ${req_name}はintermediateかな？`)
//             // 中間品であれば作成を試みる
//             const raw = masterDB
//                 .prepare("SELECT item_type FROM parts WHERE item_name = ?")
//                 .get(req_name) as { item_type: string };
//             //console.log(`${JSON.stringify(raw)}が得られたよ`)
//             if (raw && raw.item_type === "intermediate") {
//                 //console.log(`${req_name}は作れるのだろうか`)
//                 if (!isItemMakeable(req_name, req_qty)) return false;
//             } else {
//                 //console.log("ん？")
//                 // 入荷の必要あり
//                 return false;
//             }
//         }
//     }
//     return true;
// };

const isItemMakeable = (item_name: string, item_qty: number = 1): boolean => {
  const bom_id = getBomIdFromName(item_name);
  const stmt = masterDB.prepare(
    `SELECT item_name, item_qty FROM bomparts WHERE bom_id = ?`,
  );
  const requireItems = stmt.all(bom_id) as RequireItem[];

  if (!requireItems || requireItems.length === 0) {
    console.error("bom_idに紐づく部品/中間品が見つかりません:", bom_id);
    return false;
  }

  for (const { item_name: req_name, item_qty: req_qty_ } of requireItems) {
    const req_qty = item_qty * req_qty_;

    // 合計在庫で判定（中間品も部品も同じく在庫を直接確認）
    const row = appDB
      .prepare(`SELECT SUM(item_stock) as total FROM items WHERE item_name = ?`)
      .get(req_name) as { total: number } | undefined;

    const total = row?.total ?? 0;
    if (total < req_qty) return false;
  }
  return true;
};

/**
 * @param {string} item_name アイテム名
 * @return {string} bom_id
 */
const getBomIdFromName = (item_name: string): string => {
  const stmt = masterDB.prepare(`SELECT bom_id FROM boms WHERE item_name = ?`);
  const bom_id_ = stmt.get(item_name) as { bom_id: string };

  if (!bom_id_) {
    console.error("item_nameに紐づくBOMが見つかりません:", item_name);
    return "";
  }

  const { bom_id } = bom_id_;
  return bom_id;
};

/**
 *
 * @param Bom_id 必要な部品を検索したいBomのid
 * @returns 必要な部品 {"部品名":個数, ...}
 */
const getRequireItemsFromBomId = (
  Bom_id: string,
): { [key: string]: number } => {
  const stmt = masterDB.prepare(
    `SELECT item_name, item_qty FROM bomparts WHERE bom_id = ?`,
  );
  const requireItems = stmt.all(Bom_id) as RequireItem[];

  if (requireItems.length === 0) {
    return {};
  }

  let itemInfo: { [key: string]: number } = {};
  for (const { item_name, item_qty } of requireItems) {
    itemInfo[item_name] = item_qty;
  }

  return itemInfo;
};

const getTypeFromName = (item_name: string) => {
  const row = appDB
    .prepare(`SELECT item_type FROM items WHERE item_name = ?`)
    .get(item_name) as { item_name: string };
  if (!row) throw new Error("そんな名前の部品は登録されていないよ");
  return row.item_name;
};

// const getAllInputHistory = (): {
//   id: string;
//   name: string;
//   date: string;
//   qty: number;
// }[] => {
//   let result: { id: string; name: string; date: string; qty: number }[] = [];
//   const row = appDB
//     .prepare(`SELECT input_id, item_name, input_date, input_qty FROM inputs`)
//     .all() as {
//     input_id: string;
//     item_name: string;
//     input_date: string;
//     input_qty: number;
//   }[];
//   if (row.length === 0) return [];
//   for (const { input_id, item_name, input_date, input_qty } of row) {
//     result.push({
//       id: input_id,
//       name: item_name,
//       date: input_date,
//       qty: input_qty,
//     });
//   }
//   return result;
// };

const getAllInputHistory = (): {
  id: string;
  name: string;
  date: string;
  qty: number;
  supplier: string;
}[] => {
  const row = appDB
    .prepare(`SELECT input_id, item_name, input_date, input_qty, input_source FROM inputs`)
    .all() as {
    input_id: string;
    item_name: string;
    input_date: string;
    input_qty: number;
    input_source: string;
  }[];
  if (row.length === 0) return [];
  return row.map(({ input_id, item_name, input_date, input_qty, input_source }) => ({
    id: input_id,
    name: item_name,
    date: input_date,
    qty: input_qty,
    supplier: input_source,
  }));
};

const getAllOutputHistory = (): {
  id: string;
  name: string;
  date: string;
  qty: number;
  customer: string;
}[] => {
  let result: {
    id: string;
    name: string;
    date: string;
    qty: number;
    customer: string;
  }[] = [];
  const row = appDB
    .prepare(
      `SELECT output_id, item_name, output_date, output_qty, output_customer FROM outputs`,
    )
    .all() as {
    output_id: string;
    item_name: string;
    output_date: string;
    output_qty: number;
    output_customer: string;
  }[];
  if (row.length === 0) return [];
  for (const {
    output_id,
    item_name,
    output_date,
    output_qty,
    output_customer,
  } of row) {
    result.push({
      id: output_id,
      name: item_name,
      date: output_date,
      qty: output_qty,
      customer: output_customer,
    });
  }
  return result;
};

const getAllAchieveHistory = (): {
  achieve_id: string;
  item_name: string;
  date: string;
  qty: number;
}[] => {
  let result: {
    achieve_id: string;
    item_name: string;
    date: string;
    qty: number;
  }[] = [];
  const row = appDB
    .prepare(
      `SELECT item_name, achievement_id, achievement_date, achievement_qty FROM achievements`,
    )
    .all() as {
    item_name: string;
    achievement_id: string;
    achievement_date: string;
    achievement_qty: number;
  }[];
  if (row.length === 0) return [];
  for (const {
    item_name,
    achievement_id,
    achievement_date,
    achievement_qty,
  } of row) {
    result.push({
      achieve_id: achievement_id,
      item_name: item_name,
      date: achievement_date,
      qty: achievement_qty,
    });
  }
  return result;
};

export default {
  addInput,
  addOutput,
  updateInput,
  updateOutput,
  addAchievement,
  isItemMakeable,
  getItemStock,
  getBomIdFromName,
  getRequireItemsFromBomId,
  getTypeFromName,
  getAllInputHistory,
  getAllOutputHistory,
  getAllAchieveHistory,
};
