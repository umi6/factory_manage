import React, { useState, useEffect } from "react";
import Paper from "@mui/material/Paper";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import MasterDataGrid from "../components/MasterDataGrid";

type Item = { id: string; name: string; type: string };
type MakeRecord = {
  achieve_id: string;
  item_name: string;
  qty: number;
  date: string;
};
type BomTree = {
  [itemName: string]: { qty: number; req_items: BomTree | undefined };
};

// 後から共通コンポーネント: dgHeaderSx に置き換え可
const dgHeaderSx = {
  "& .MuiDataGrid-columnHeader": {
    backgroundColor: "var(--accent-color)",
    color: "#fff",
  },
  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold" },
};

const flattenBomTree = (
  tree: BomTree,
  multiplier: number,
  result: { [name: string]: number } = {},
): { [name: string]: number } => {
  for (const [name, { qty, req_items }] of Object.entries(tree)) {
    const totalQty = qty * multiplier;
    if (req_items && Object.keys(req_items).length > 0) {
      flattenBomTree(req_items, totalQty, result);
    } else {
      result[name] = (result[name] ?? 0) + totalQty;
    }
  }
  return result;
};

const BomTreeNode: React.FC<{
  tree: BomTree;
  stockMap: { [name: string]: number };
  depth: number;
}> = ({ tree, stockMap, depth }) => (
  <div>
    {Object.entries(tree).map(([name, { qty, req_items }]) => {
      const stock = Math.max(0, stockMap[name] ?? 0);
      const shortage = Math.max(0, qty - stock);
      const hasChildren = req_items && Object.keys(req_items).length > 0;
      return (
        <div key={name}>
          <div
            style={{
              display: "flex",
              gap: 12,
              padding: "4px 0",
              marginLeft: depth * 24,
              color: !hasChildren && shortage > 0 ? "#c62828" : "inherit",
            }}
          >
            <span style={{ color: "#999" }}>
              {"─".repeat(depth > 0 ? 1 : 0)}
            </span>
            <span style={{ fontWeight: hasChildren ? "bold" : "normal" }}>
              {name}
              {hasChildren ? `（中間品/完成品 × ${qty}）` : ` × ${qty}`}
            </span>
            {!hasChildren && (
              <>
                <span style={{ color: "#666" }}>在庫: {stock}</span>
                {shortage > 0 && (
                  <span style={{ fontWeight: "bold", color: "#c62828" }}>
                    不足: {shortage}
                  </span>
                )}
              </>
            )}
          </div>
          {hasChildren && (
            <BomTreeNode
              tree={req_items!}
              stockMap={stockMap}
              depth={depth + 1}
            />
          )}
        </div>
      );
    })}
  </div>
);

const MakeRecords: React.FC = () => {
  // 後から共通コンポーネント: ModeToggle に置き換え可
  const [mode, setMode] = useState<"view" | "register">("view");
  const isRegisterMode = mode === "register";

  const [allItems, setAllItems] = useState<Item[]>([]);
  const [records, setRecords] = useState<MakeRecord[]>([]);
  const [finishedProductsName, setFinishedProductsName] = useState("");
  const [amount, setAmount] = useState<number>(1);
  const [finishedDate, setFinishedDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [makeable, setMakeable] = useState<boolean | null>(null);
  const [bomTree, setBomTree] = useState<BomTree | null>(null);
  const [stockMap, setStockMap] = useState<{ [name: string]: number }>({});
  const [bomLoading, setBomLoading] = useState(false);

  const handleGetAllItems = async () => {
    const response = await fetch("http://localhost:3141/api/master/parts");
    if (!response.ok) return;
    const json = await response.json();
    const rows = json.result ?? json;
    setAllItems(
      (rows || [])
        .filter(
          (item: any) =>
            item.item_type === "intermediate" || item.item_type === "product",
        )
        .map((item: any) => ({
          id: item.part_id,
          name: item.item_name,
          type: item.item_type,
        }))
        .sort((a: Item, b: Item) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === "intermediate" ? -1 : 1;
        }),
    );
  };

  const handleGetAllAchieves = async () => {
    const response = await fetch("http://localhost:3141/api/all-achieves");
    if (!response.ok) return;
    const json = await response.json();
    const rows = json.result ?? json;
    setRecords(rows || []);
  };

  const handleAddMakeRecord = async () => {
    const response = await fetch("http://localhost:3141/api/achieve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_name: finishedProductsName.trim(),
        achievement_date: finishedDate,
        achievement_qty: amount,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "登録に失敗しました");
    }
  };

  const handleProductChange = async (val: string) => {
    setFinishedProductsName(val);
    setMakeable(null);
    setBomTree(null);
    setStockMap({});
    if (!val) return;

    setBomLoading(true);
    try {
      const makeableRes = await fetch(
        `http://localhost:3141/api/item-makeable?item_name=${encodeURIComponent(val)}`,
      );
      const makeableJson = await makeableRes.json();
      setMakeable(makeableJson.itemMakeable ?? false);

      const treeRes = await fetch(
        `http://localhost:3141/api/master/bom-tree?item_name=${encodeURIComponent(val)}`,
      );
      if (!treeRes.ok) return;
      const treeJson = await treeRes.json();
      const tree: BomTree = treeJson.result;
      setBomTree(tree);

      const flat = flattenBomTree(tree, 1);
      const stockEntries = await Promise.all(
        Object.keys(flat).map(async (name) => {
          const stockRes = await fetch(
            `http://localhost:3141/api/item-stock?item_name=${encodeURIComponent(name)}`,
          );
          const stockJson = await stockRes.json();
          return [name, Math.max(0, stockJson.item_stock ?? 0)] as [
            string,
            number,
          ];
        }),
      );
      setStockMap(Object.fromEntries(stockEntries));
    } catch (err) {
      console.error(err);
    } finally {
      setBomLoading(false);
    }
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!finishedProductsName.trim()) {
      alert("完成品名を選択してください。");
      return;
    }
    if (amount <= 0) {
      alert("数量は1以上を入力してください。");
      return;
    }
    if (makeable === false) {
      alert("部品の在庫が不足しているため組立できません。");
      return;
    }

    try {
      await handleAddMakeRecord();
      setFinishedProductsName("");
      setAmount(1);
      setFinishedDate(new Date().toISOString().slice(0, 10));
      setMakeable(null);
      setBomTree(null);
      setStockMap({});
      alert("組立実績が登録されました。");
      await handleGetAllAchieves();
      // setMode("view");
    } catch (err) {
      alert(err instanceof Error ? err.message : "登録に失敗しました。");
    }
  };

  useEffect(() => {
    handleGetAllItems();
    handleGetAllAchieves();
  }, []);

  const columns: GridColDef[] = [
    {
      field: "item_name",
      headerName: "組立品名",
      flex: 1,
      resizable: false,
      hideable: false,
    },
    {
      field: "qty",
      headerName: "数量",
      width: 100,
      resizable: false,
      hideable: false,
      type: "number",
    },
    {
      field: "date",
      headerName: "組立日",
      width: 150,
      resizable: false,
      hideable: false,
    },
  ];

  return (
    <div style={{ maxWidth: "100%", padding: 16, boxSizing: "border-box" }}>
      {/* 後から共通コンポーネント: ModeToggle に置き換え可 */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          boxSizing: "border-box",
        }}
      >
        <button
          type="button"
          onClick={() => setMode("view")}
          style={{
            padding: "10px 16px",
            backgroundColor: mode === "view" ? "var(--accent-color)" : "#fff",
            color: mode === "view" ? "#fff" : "#000",
            border: "1px solid #ccc",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          一覧
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          style={{
            padding: "10px 16px",
            backgroundColor:
              mode === "register" ? "var(--accent-color)" : "#fff",
            color: mode === "register" ? "#fff" : "#000",
            border: "1px solid #ccc",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          登録
        </button>
      </div>

      <h2>組立{isRegisterMode ? "登録" : "一覧"}ページ</h2>

      {/* 後から共通コンポーネント: FormPanel に置き換え可 */}
      {isRegisterMode && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            backgroundColor: "#fafafa",
            boxSizing: "border-box",
          }}
        >
          <h3 style={{ marginTop: 0 }}>新規組立登録</h3>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <label>
              完成品・中間品選択
              <select
                value={finishedProductsName}
                onChange={(e) => handleProductChange(e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  marginTop: 4,
                  boxSizing: "border-box",
                }}
              >
                <option value="">完成品・中間品を選択してください</option>
                {allItems.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}（
                    {item.type === "intermediate" ? "中間品" : "完成品"}）
                  </option>
                ))}
              </select>
              {bomLoading && (
                <p style={{ color: "#999", marginTop: 8 }}>読込中...</p>
              )}
              {finishedProductsName && !bomLoading && (
                <div
                  style={{
                    marginTop: 12,
                    padding: 12,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                  }}
                >
                  <p
                    style={{
                      fontWeight: "bold",
                      color: makeable ? "#2e7d32" : "#c62828",
                      marginTop: 0,
                    }}
                  >
                    {makeable
                      ? "組立可能"
                      : "在庫が不足しているため組立できません"}
                  </p>
                  <p style={{ fontWeight: "bold", marginBottom: 8 }}>
                    必要部品：
                  </p>
                  {bomTree && (
                    <BomTreeNode tree={bomTree} stockMap={stockMap} depth={0} />
                  )}
                </div>
              )}
            </label>

            <label>
              数量
              <input
                type="number"
                value={amount}
                min={1}
                onChange={(e) => setAmount(Number(e.target.value))}
                style={{
                  width: "100%",
                  padding: 8,
                  marginTop: 4,
                  boxSizing: "border-box",
                }}
              />
            </label>

            <label>
              組立日
              <input
                type="date"
                value={finishedDate}
                onChange={(e) => setFinishedDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  marginTop: 4,
                  boxSizing: "border-box",
                }}
              />
            </label>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="submit"
                style={{
                  padding: "10px 16px",
                  backgroundColor: "var(--accent-color)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                登録する
              </button>
              <button
                type="button"
                onClick={() => setMode("view")}
                style={{
                  padding: "10px 16px",
                  borderRadius: 4,
                  cursor: "pointer",
                  border: "1px solid #ccc",
                  boxSizing: "border-box",
                }}
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 後から共通コンポーネント: dgHeaderSx に置き換え可 */}
      {!isRegisterMode && (
        <MasterDataGrid<MakeRecord>
          rows={records.map((record) => ({ id: record.achieve_id, ...record }))}
          columns={columns}
          height={631}
          mode="view"
        />
      )}
    </div>
  );
};

export default MakeRecords;
