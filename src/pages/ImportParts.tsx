import React, { useState, useEffect } from "react";
import type { GridColDef } from "@mui/x-data-grid";
import MasterDataGrid from "../components/MasterDataGrid";

type Part = { id: string; name: string };
type ImportRecord = { name: string; date: string; qty: number; supplier: string };

// 後から共通コンポーネント: dgHeaderSx に置き換え可
const dgHeaderSx = {
  "& .MuiDataGrid-columnHeader": { backgroundColor: "#6484e3", color: "#fff" },
  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold" },
};

const ImportParts: React.FC = () => {
  // 後から共通コンポーネント: ModeToggle に置き換え可
  const [mode, setMode] = useState<"view" | "register">("view");
  const isRegisterMode = mode === "register";

  const [allParts, setAllParts] = useState<Part[]>([]);
  const [importedParts, setImportedParts] = useState<ImportRecord[]>([]);
  const [selectedPartName, setSelectedPartName] = useState("");
  const [supplier, setSupplier] = useState("");
  const [amount, setAmount] = useState<number>(1);
  const [importDate, setImportDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );

  const handleGetAllParts = async () => {
    const response = await fetch("http://localhost:3141/api/master/parts");
    if (!response.ok) return;
    const json = await response.json();
    const rows = json.result ?? json;
    setAllParts(
      (rows || [])
        .filter((item: any) => item.item_type === "part")
        .map((item: any) => ({ id: item.part_id, name: item.item_name })),
    );
  };

  const handleGetAllInputs = async () => {
    const response = await fetch("http://localhost:3141/api/all-inputs");
    if (!response.ok) return;
    const json = await response.json();
    const rows = json.result ?? json;
    setImportedParts(rows || []);
  };

  const handleAddImport = async () => {
    const response = await fetch("http://localhost:3141/api/input", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partName: selectedPartName,
        supplier: supplier,
        stock: amount,
        date: importDate,
      }),
    });
    if (!response.ok) throw new Error("登録に失敗しました");
  };

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    if (!selectedPartName) {
      alert("部品を選択してください。");
      return;
    }
    if (amount <= 0) {
      alert("数量は1以上を入力してください。");
      return;
    }

    try {
      await handleAddImport();
      setSelectedPartName("");
      setAmount(1);
      setImportDate(new Date().toISOString().slice(0, 10));
      alert("入荷実績が登録されました。");
      await handleGetAllInputs();
      //setMode("view");
    } catch (err) {
      alert(err instanceof Error ? err.message : "登録に失敗しました。");
    }
  };

  useEffect(() => {
    handleGetAllParts();
    handleGetAllInputs();
  }, []);

  // 一覧用カラム定義
  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "部品名",
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
      field: "supplier",
      headerName: "入荷元",
      width: 150,
      resizable: false,
      hideable: false,
    },
    {
      field: "date",
      headerName: "入荷日",
      width: 150,
      resizable: false,
      hideable: false,
    },
  ];

  return (
    <div style={{ maxWidth: "100%", padding: 16, boxSizing: "border-box" }}>
      <h2>入荷{isRegisterMode ? "登録" : "一覧"}ページ</h2>
      {/* 後から共通コンポーネント: ModeToggle に置き換え可（一覧/登録） */}
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
            backgroundColor: mode === "view" ? "#4CC496" : "#fff",
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
            backgroundColor: mode === "register" ? "#4CC496" : "#fff",
            color: mode === "register" ? "#fff" : "#000",
            border: "1px solid #ccc",
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          登録
        </button>
      </div>

      {/* 後から共通コンポーネント: FormPanel に置き換え可 */}
      {isRegisterMode && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            backgroundColor: "#fafafa",
          }}
        >
          <h3 style={{ marginTop: 0 }}>新規入荷登録</h3>
          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12 }}>
            <label>
              部品選択
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
                <option value="">部品を選択してください</option>
                {allParts.map((part) => (
                  <option key={part.id} value={part.name}>
                    {part.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              入荷元
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
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
              入荷日
              <input
                type="date"
                value={importDate}
                onChange={(e) => setImportDate(e.target.value)}
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
                  backgroundColor: "#4CC496",
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
        <MasterDataGrid<ImportRecord>
          rows={importedParts}
          columns={columns}
          height={631}
        />
      )}
    </div>
  );
};

export default ImportParts;
