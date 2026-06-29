import express from "express";

import addMaster from "../controller/masterController.tsx";
import itemController from "../controller/itemController.tsx";

//import stock from "../stock.tsx";
const {
  addPart,
  addBom,
  updatePart,
  updateBom,
  getAllParts,
  getBom,
  getBomTree,
  getAllBoms,
  deletePart,
  deleteParts,
  deleteBom,
  deleteBoms,
} = addMaster;

export const router = express.Router();

const {
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
} = itemController;

//入荷
/*使用例：
fetch("/api/input", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    partName: "part1",
    stock: 10,
    date: "2023-01-01",
  })
*/
router.post("/input", (req: express.Request, res: express.Response) => {
  const partName: string = req.body.partName;
  const supplier: string = req.body.supplier;
  const initialStock: number = req.body.stock || 0;
  const inputDate: string =
    req.body.date || new Date().toISOString().split("T")[0];
  //関数を呼び出し
  if (!supplier) console.log("私はtaskRouterです.supplierを渡しなさい");
  res.json({ stock: addInput(partName, supplier, initialStock, inputDate) }); //要変更
});

//出荷
/*使用例：

fetch("/api/output",{
method: "POST",
headers: {
"Content-Type": "application/json",
},
body: JSON.stringify({
    productName: "product1",
    date: "2023-01-01",
    qty: 5,
    customer: "customer1",
}),
})
*/
router.post("/output", (req: express.Request, res: express.Response) => {
  const productName: string = req.body.productName as string;
  const outputDate: string =
    (req.body.date as string) || new Date().toISOString().split("T")[0];
  const outputQty: number = parseInt(req.body.qty as string) || 1;
  const outputCustomer: string =
    (req.body.customer as string) || "default_customer";
  // const productId: string = getItemStock(productName).toString();
  //関数を呼び出し
  // res.json({
  //   stock: addOutputFromName(
  //     productName,
  //     outputDate,
  //     outputQty,
  //     outputCustomer,
  //   ),
  // }); //要変更  <- 変更させていただきます
  try {
    addOutput(productName, outputDate, outputQty, outputCustomer);
    res.json({ message: "出荷しました" });
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

router.get("/update-input", (req: express.Request, res: express.Response) => {
  const input_id = req.body.input_id as string | undefined;
  const updateData = req.body.updateData as
    | { input_date: string; input_qty: number; input_source: string }
    | undefined;

  if (!input_id)
    return res
      .status(400)
      .json({ error: "必要な情報がbodyに含まれていません: input_id" });
  if (!updateData)
    return res
      .status(400)
      .json({ error: "必要な情報がbodyに含まれていません: updateData" });

  try {
    updateInput(input_id, updateData);
    res.status(200).json({ message: "入荷情報の更新に成功しました" });
  } catch (e: any) {
    console.error("エラー:" + e);
    res.status(500).json({ error: "入荷情報の更新に失敗しました" });
  }
});

router.get("/update-output", (req: express.Request, res: express.Response) => {
  const output_id = req.body.output_id as string | undefined;
  const updateData = req.body.updateData as
    | { output_date: string; output_qty: number; output_customer: string }
    | undefined;

  if (!output_id)
    return res
      .status(400)
      .json({ error: "必要な情報がbodyに含まれていません: output_id" });
  if (!updateData)
    return res
      .status(400)
      .json({ error: "必要な情報がbodyに含まれていません: updateData" });

  try {
    updateOutput(output_id, updateData);
    res.status(200).json({ message: "出荷情報の更新に成功しました" });
  } catch (e: any) {
    console.error("エラー:" + e);
    res.status(500).json({ error: "出荷情報の更新に失敗しました" });
  }
});

router.get("/item-type", (req: express.Request, res: express.Response) => {
  const item_name = req.query.item_name as string | undefined;
  let result: string;
  try {
    if (item_name) result = getTypeFromName(item_name);
    else {
      return res
        .status(400)
        .json({ error: "必要なクエリが含まれていません: item_name" });
    }

    res
      .status(200)
      .json({ message: "item_typeを取得しました", item_type: result });
  } catch (e: any) {
    console.error("エラー:" + e);
    res.status(500).json({ error: "item_typeの取得に失敗しました" });
  }
});

router.get("/item-stock", (req: express.Request, res: express.Response) => {
  const item_name = req.query.item_name as string | undefined;
  if (!item_name)
    return res
      .status(400)
      .json({ error: "必要なクエリが含まれていません: item_name" });

  try {
    //console.log(`${item_name}のストックを確認するよ`)
    const result = getItemStock(item_name);
    res
      .status(200)
      .json({ message: "item_stockを取得しました", item_stock: result });
  } catch (e: any) {
    //console.error("エラー:" + e);
    res.status(500).json({ error: "item_stockの取得に失敗しました" });
  }
});

router.get("/item-makeable", (req: express.Request, res: express.Response) => {
  const item_name = req.query.item_name as string | undefined;
  const item_qty = req.query.item_qty ? Number(req.query.item_qty) : undefined;
  if (!item_name)
    return res
      .status(400)
      .json({ error: "必要なクエリが含まれていません: item_name, [item_qty]" });

  try {
    const result = isItemMakeable(item_name, item_qty ? item_qty : 1);
    res
      .status(200)
      .json({ message: "itemMakeableを取得しました", itemMakeable: result });
  } catch (e: any) {
    console.error("エラー:" + e);
    res.status(500).json({ error: "itemMakeableの取得に失敗しました" });
  }
});

router.get("/bom-id", (req: express.Request, res: express.Response) => {
  const item_name = req.query.item_name as string | undefined;
  if (!item_name)
    return res
      .status(400)
      .json({ error: "必要なクエリが含まれていません: item_name" });

  try {
    const result = getBomIdFromName(item_name);
    res.status(200).json({ message: "bom_idを取得しました", bom_id: result });
  } catch (e: any) {
    console.error("エラー:" + e);
    res.status(500).json({ error: "bom_idの取得に失敗しました" });
  }
});

router.get(
  "/bom-require-items",
  (req: express.Request, res: express.Response) => {
    const bom_id = req.query.bom_id as string | undefined;
    if (!bom_id)
      return res
        .status(400)
        .json({ error: "必要なクエリが含まれていません: bom_id" });

    try {
      const result = getRequireItemsFromBomId(bom_id);
      res
        .status(200)
        .json({ message: "requireItemsを取得しました", requireItems: result });
    } catch (e: any) {
      console.error("エラー:" + e);
      res.status(500).json({ error: "requireItemsの取得に失敗しました" });
    }
  },
);

router.get("/all-inputs", (req: express.Request, res: express.Response) => {
  try {
    const result = getAllInputHistory();
    res
      .status(200)
      .json({ message: "全ての入荷履歴を取得しました", result: result });
  } catch (e: any) {
    console.error("エラー:" + e);
    res.status(500).json({ error: "入荷履歴の取得に失敗しました" });
  }
});

router.get("/all-outputs", (req: express.Request, res: express.Response) => {
  try {
    const result = getAllOutputHistory();
    res
      .status(200)
      .json({ message: "全ての出荷履歴を取得しました", result: result });
  } catch (e: any) {
    console.error("エラー:" + e);
    res.status(500).json({ error: "出荷履歴の取得に失敗しました" });
  }
});

router.post("/achieve", (req: express.Request, res: express.Response) => {
  const { item_name, achievement_date, achievement_qty } = req.body;
  if (!item_name || !achievement_date || !achievement_qty) {
    return res
      .status(400)
      .json({
        error:
          "必要なbodyが含まれていません: item_name, achievement_date, achievement_qty",
      });
  }
  try {
    const result = addAchievement(item_name, achievement_date, achievement_qty);
    res.status(200).json({ message: "工程を追加しました", result: result });
  } catch (e: any) {
    console.error("エラー:" + e);
    res.status(500).json({ error: e.message || "工程の追加に失敗しました" });
  }
});

router.get("/all-achieves", (req: express.Request, res: express.Response) => {
  try {
    const result = getAllAchieveHistory();
    res
      .status(200)
      .json({ message: "全ての作成履歴を取得しました", result: result });
  } catch (e: any) {
    console.error("エラー:" + e);
    res
      .status(500)
      .json({ error: e.message || "作成履歴の取得に失敗しました" });
  }
});

// router.get("/stock", (req: express.Request, res: express.Response) => { });

// router.get("/stock/:name", (req: express.Request, res: express.Response) => {
//   const productName: string = req.params.name as string;
//   const object = getItemStock(productName);
//   const stockById = object["sum"] || 0;
//   res.json({ stock: stockById });
// });

router.post("/master/add-part", addPart);
router.post("/master/add-bom", addBom);
router.post("/master/update-part", updatePart);
router.post("/master/update-bom", updateBom);
router.get("/master/parts", getAllParts);
router.get("/master/boms", getAllBoms);
router.get("/master/bom", getBom);
router.get("/master/bom-tree", getBomTree);
router.post("/master/delete-part", deletePart);
router.post("/master/delete-parts", deleteParts);
router.post("/master/delete-bom", deleteBom);
router.post("/master/delete-boms", deleteBoms);
// router.post('/achievement', addAchievement);

// router.post('/get-requireItems', getRequireItemsFromBomId);

//マスタのCRUD

import seri from "../controller/serialize.tsx";
const { serialize, deserialize } = seri;


router.get("/serialize", (req: express.Request, res: express.Response) => {
  try {
    const s = serialize();
    return res.status(200).json({ message: "シリアライズに成功しました", result: JSON.stringify(s) });
  } catch {
    return res.status(500).json({ error: "シリアライズに失敗しました" });
  }
});

router.post("/deserialize", (req: express.Request, res: express.Response) => {
  const s = req.body.json;
  if (!s) return res.status(400).json({ error: "必要なbodyが不足: s" });
  try {
    deserialize(JSON.parse(s));
    return res.status(200).json({ message: "デシリアライズに成功しました" });
  } catch {
    return res.status(500).json({ error: "デシリアライズに失敗しました" });
  }
});