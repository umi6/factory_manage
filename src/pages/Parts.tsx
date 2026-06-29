import React, { useEffect, useState } from "react";

import ModeToolbar from "../components/ModeToolbar";
import MasterDataGrid from "../components/MasterDataGrid";
import type { PageMode } from "../components/ModeToolbar";

import type { GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";

type Part = { id: string; name: string; type?: string };
type Option = { value: string; label: string };

const options: Option[] = [
  { value: "part", label: "部品" },
  { value: "intermediate", label: "中間品" },
  { value: "product", label: "完成品" },
];

const Parts: React.FC = () => {
  const [mode, setMode] = useState<PageMode>("view");
  const [parts, setParts] = useState<Part[]>([]);

  const isEditMode = mode === "edit";

  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>({
    type: "include",
    ids: new Set(),
  });

  // 登録フォームの表示フラグ
  const [showRegisterForm, setShowRegisterForm] = useState(false);

  const [name, setName] = useState("");
  const [selectedOption, setSelectedOption] = useState<string>(
    options[0].value,
  );

  const handleModeChange = (nextMode: PageMode) => {
    setMode(nextMode);

    if (nextMode === "view") {
      setShowRegisterForm(false);
      setSelectedRows({ type: "include", ids: new Set() });
    }
  };

  // 部品一覧の取得
  const handleGetAllParts = async () => {
    const response = await fetch("http://localhost:3141/api/master/parts", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("部品一覧の取得に失敗しました");
    const json = await response.json();
    const rows = json.result ?? json;
    setParts(
      (rows || []).map((item: any) => ({
        id: item.part_id,
        name: item.item_name,
        type: item.item_type,
      })),
    );
  };

  // 部品登録
  const handleAddMaster = async () => {
    if (!name.trim()) {
      alert("部品名を入力してください。");
      return;
    }
    const response = await fetch(
      `http://localhost:3141/api/master/add-part/?item_name=${encodeURIComponent(name.trim())}&item_type=${selectedOption}`,
      { method: "POST", headers: { "Content-Type": "application/json" } },
    );
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      alert(errorData.error || "登録に失敗しました");
      return;
    }
    setName("");
    setSelectedOption(options[0].value);
    setShowRegisterForm(false);
    await handleGetAllParts();
  };

  // 部品削除
  const handleDelete = async () => {
    if (selectedRows.ids.size === 0) return;
    const itemNames = parts
      .filter((p) => selectedRows.ids.has(p.id))
      .map((p) => p.name);
    if (!window.confirm(`${itemNames.length}件の部品を削除しますか？`)) return;
    try {
      const response = await fetch(
        "http://localhost:3141/api/master/delete-parts",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ item_names: itemNames }),
        },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "削除に失敗しました");
      }
      alert("削除しました。");
      await handleGetAllParts();
      setSelectedRows({ type: "include", ids: new Set() });
    } catch (err) {
      alert(err instanceof Error ? err.message : "削除に失敗しました。");
    }
  };

  // 部品更新
  const handleProcessRowUpdate = async (
    newRow: Part,
    oldRow: Part,
  ): Promise<Part> => {
    const params = new URLSearchParams();
    params.append("part_id", newRow.id);
    if (newRow.name !== oldRow.name) params.append("item_name", newRow.name);
    if (newRow.type !== oldRow.type)
      params.append("item_type", newRow.type ?? "");

    const response = await fetch(
      `http://localhost:3141/api/master/update-part?${params.toString()}`,
      { method: "POST" },
    );
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error ?? "更新に失敗しました");
    }
    setParts((prev) => prev.map((p) => (p.id === newRow.id ? newRow : p)));
    return newRow;
  };

  useEffect(() => {
    handleGetAllParts();
  }, []);

  /*
  
  表について
  IDは非表示
  flex: 1 で残った横幅をすべてそのカラムに割り振る

  全てのカラム共通で
  hideable: false で列の表示/非表示を切り替えられないようにする
  resizable: false で列の幅を変更できないようにする

  編集するときは editable: true をつける

  */

  //閲覧用と編集用の列定義を統合
  const columns: GridColDef<Part>[] = [
    {
      field: "name",
      headerName: "部品名",
      flex: 1,
      editable: true,
    },
    {
      field: "type",
      headerName: "種別",
      hideable: false,
      width: 150,
      editable: true,
      type: "singleSelect",

      valueOptions: options.map((o) => ({
        value: o.value,
        label: o.label,
      })),
      valueFormatter: (value) => {
        const opt = options.find((o) => o.value === value);
        return opt ? opt.label : value;
      },
    },
  ];

  return (
    <div style={{ maxWidth: "100%", padding: 16, boxSizing: "border-box" }}>
      <h2>部品ページ</h2>
      {/* モード切替ボタン */}
      <ModeToolbar
        mode={mode}
        selectedCount={selectedRows.ids.size}
        onModeChange={handleModeChange}
        onAdd={() => setShowRegisterForm((prev) => !prev)}
        onDelete={handleDelete}
        onRefresh={handleGetAllParts}
      />

      {/* 登録フォーム（登録モード時のみ、インライン展開） */}
      {isEditMode && showRegisterForm && (
        <div
          style={{
            border: "1px solid #ddd",
            borderRadius: 8,
            padding: 16,
            marginBottom: 16,
            backgroundColor: "#fafafa",
          }}
        >
          <h3 style={{ marginTop: 0 }}>新規部品登録</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <label>
              部品名
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="部品名を入力"
                style={{ width: "100%", padding: 8, marginTop: 4 }}
              />
            </label>
            <label>
              種別
              <select
                value={selectedOption}
                onChange={(e) => setSelectedOption(e.target.value)}
                style={{ padding: 8, marginTop: 4 }}
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleAddMaster}
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
                onClick={() => setShowRegisterForm(false)}
                style={{
                  padding: "10px 16px",
                  borderRadius: 4,
                  cursor: "pointer",
                  border: "1px solid #ccc",
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      <MasterDataGrid<Part>
        rows={parts}
        columns={columns}
        mode={mode}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        onRowUpdate={handleProcessRowUpdate}
      />
    </div>
  );
};

export default Parts;
