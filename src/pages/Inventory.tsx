import React, { useEffect, useState } from "react";
import Paper from "@mui/material/Paper";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";
import MasterDataGrid from "../components/MasterDataGrid";

// 後から共通コンポーネントに置き換えられるようにまとめておく
const dgHeaderSx = {
  "& .MuiDataGrid-columnHeader": { backgroundColor: "#6484e3", color: "#fff" },
  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold" },
};

type StockRow = {
  id: string;
  name: string;
  type: string;
  stock: number;
};

const StockCheck: React.FC = () => {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);

  const handleGetAllStock = async () => {
    setLoading(true);
    try {
      // 全部品を取得
      const res = await fetch("http://localhost:3141/api/master/parts");
      if (!res.ok) throw new Error("部品一覧の取得に失敗しました");
      const json = await res.json();
      const parts = json.result ?? json;

      // 各部品の在庫を並列取得
      const stockRows = await Promise.all(
        (parts || []).map(async (item: any) => {
          try {
            const stockRes = await fetch(
              `http://localhost:3141/api/item-stock?item_name=${encodeURIComponent(item.item_name)}`,
            );
            if (!stockRes.ok)
              return {
                id: item.part_id,
                name: item.item_name,
                type: item.item_type,
                stock: 0,
              };
            const stockJson = await stockRes.json();
            const stock: number = stockJson.item_stock ?? 0;
            return {
              id: item.part_id,
              name: item.item_name,
              type: item.item_type,
              stock,
            };
          } catch {
            return {
              id: item.part_id,
              name: item.item_name,
              type: item.item_type,
              stock: 0,
            };
          }
        }),
      );
      setRows(stockRows);
    } catch (err) {
      alert(err instanceof Error ? err.message : "取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGetAllStock();
  }, []);

  // 後から共通コンポーネントに置き換えられるようにカラム定義を分離
  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "部品名",
      flex: 1,
      resizable: false,
      hideable: false,
    },
    {
      field: "type",
      headerName: "種別",
      width: 120,
      resizable: false,
      hideable: false,
      valueFormatter: (value) =>
        value === "product"
          ? "完成品"
          : value === "intermediate"
            ? "中間品"
            : "部品",
    },
    {
      field: "stock",
      headerName: "在庫数",
      width: 120,
      resizable: false,
      hideable: false,
      type: "number",
    },
  ];

  return (
    <div style={{ maxWidth: "100%", padding: 16, boxSizing: "border-box" }}>
      <h2>在庫確認ページ</h2>

      {/* 後から共通コンポーネント DeleteButton に置き換え可 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          type="button"
          onClick={handleGetAllStock}
          disabled={loading}
          style={{
            padding: "10px 16px",
            borderRadius: 4,
            cursor: "pointer",
            border: "1px solid #ccc",
            backgroundColor: "#fff",
          }}
        >
          {loading ? "読込中..." : "更新"}
        </button>
      </div>

      {/* 後から共通コンポーネント dgHeaderSx に置き換え可 */}
      <MasterDataGrid rows={rows} columns={columns} />
    </div>
  );
};

export default StockCheck;
