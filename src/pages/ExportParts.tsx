import React, { useState, useEffect } from "react";
import type { GridColDef } from "@mui/x-data-grid";
// import ModeToolbar from "../components/ModeToolbar"; //view/editモードは使えないので必要ない
import MasterDataGrid from "../components/MasterDataGrid";
// import type { PageMode } from "../components/ModeToolbar"; //view/editモードは使えないので必要ない

type Part = { id: string; name: string; stock: number; type: "product" };
type ExportRecord = {
  name: string;
  date: string;
  qty: number;
  customer: string;
};

// 後から共通コンポーネント: dgHeaderSx に置き換え可
// const dgHeaderSx = {
//   "& .MuiDataGrid-columnHeader": { backgroundColor: "#6484e3", color: "#fff" },
//   "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold" },
// };

const ExportParts: React.FC = () => {
  // 後から共通コンポーネント: ModeToggle に置き換え可
  const [mode, setMode] = useState<"view" | "register">("view");
  const isRegisterMode = mode === "register";

  const [allParts, setAllParts] = useState<Part[]>([]);
  const [exportedParts, setExportedParts] = useState<ExportRecord[]>([]);
  const [selectedPartName, setSelectedPartName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState<number>(1);
  const [exportDate, setExportDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  const handleGetAllParts = async () => {
    const response = await fetch("http://localhost:3141/api/master/parts");
    if (!response.ok) return;
    const json = await response.json();
    const rows = json.result ?? json;
    const targets = (rows || []).filter(
      (item: any) => item.item_type === "product",
    );

    const withStock = await Promise.all(
      targets.map(async (item: any) => {
        const res = await fetch(
          `http://localhost:3141/api/item-stock?item_name=${encodeURIComponent(item.item_name)}`,
        );
        if (!res.ok) return null;
        const stockJson = await res.json();
        const stock: number = stockJson.item_stock ?? 0;

        return stock > 0
          ? {
              name: item.item_name,
              stock,
              type: item.item_type,
            }
          : null;
      }),
    );
    setAllParts(withStock.filter((p): p is Part => p !== null));
  };

  const handleGetAllOutputs = async () => {
    const response = await fetch("http://localhost:3141/api/all-outputs");
    if (!response.ok) return;
    const json = await response.json();
    const rows = json.result ?? json;
    setExportedParts(rows || []);
  };

  const handleAddExport = async () => {
    const response = await fetch("http://localhost:3141/api/output", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productName: selectedPartName,
        qty: amount,
        date: exportDate,
        customer: customerName,
      }),
    });
    if (!response.ok) throw new Error("登録に失敗しました");
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!selectedPartName) {
      alert("完成品を選択してください。");
      return;
    }
    if (!customerName.trim()) {
      alert("出荷先を入力してください。");
      return;
    }
    if (amount <= 0) {
      alert("数量は1以上を入力してください。");
      return;
    }

    try {
      await handleAddExport();
      setSelectedPartName("");
      setCustomerName("");
      setAmount(1);
      setExportDate(new Date().toISOString().slice(0, 10));
      alert("出荷実績が登録されました。");
      await Promise.all([handleGetAllParts(), handleGetAllOutputs()]);
      // setMode("view");
    } catch (err) {
      alert(err instanceof Error ? err.message : "登録に失敗しました。");
    }
  };

  useEffect(() => {
    handleGetAllParts();
    handleGetAllOutputs();
  }, []);

  const columns: GridColDef<ExportRecord>[] = [
    {
      field: "name",
      headerName: "完成品名",
      flex: 1,
    },
    {
      field: "qty",
      headerName: "数量",
      width: 100,
      type: "number",
    },
    {
      field: "customer",
      headerName: "出荷先",
      width: 180,
    },
    {
      field: "date",
      headerName: "出荷日",
      width: 150,
    },
  ];

  return (
    <div style={{ maxWidth: "100%", padding: 16, boxSizing: "border-box" }}>
      {/* 後から共通コンポーネント: ModeToggle に置き換え可（一覧/登録） */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
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

      <h2>出荷{isRegisterMode ? "登録" : "一覧"}ページ</h2>
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
          <h3 style={{ marginTop: 0 }}>新規出荷登録</h3>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <label>
              完成品選択
              <select
                value={selectedPartName}
                onChange={(e) => setSelectedPartName(e.target.value)}
                style={{
                  width: "100%",
                  padding: 8,
                  marginTop: 4,
                  boxSizing: "border-box",
                }}
              >
                <option value="">出荷する完成品を選択してください</option>
                {allParts.map((part) => (
                  <option key={part.id} value={part.name}>
                    {part.name}（在庫: {part.stock}）
                  </option>
                ))}
              </select>
            </label>
            <label>
              出荷先名
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="出荷先名を入力"
                style={{
                  width: "100%",
                  padding: 8,
                  marginTop: 4,
                  boxSizing: "border-box",
                }}
              />
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
              出荷日
              <input
                type="date"
                value={exportDate}
                onChange={(e) => setExportDate(e.target.value)}
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

      {!isRegisterMode && (
        <MasterDataGrid<ExportRecord>
          rows={exportedParts.map((record, index) => ({
            id: index,
            ...record,
          }))}
          columns={columns}
          height={631}
          mode="view"
        />
      )}
    </div>
  );
};

export default ExportParts;
