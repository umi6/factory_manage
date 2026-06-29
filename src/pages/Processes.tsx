import React, { useEffect, useState } from "react";

import ModeToolbar from "../components/ModeToolbar";
import MasterDataGrid from "../components/MasterDataGrid";
import type { PageMode } from "../components/ModeToolbar";

import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";

import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridRowSelectionModel } from "@mui/x-data-grid";

const GREEN = "#4CC496";

type Part = { id: string; name: string; type: string };
type Process = {
  id: string;
  name: string;
  description: string;
  itemName: string;
  items: { [key: string]: number };
};
type SelectedPart = { name: string; qty: number };
type EditingItem = { name: string; qty: number };

const headerStyle = {
  backgroundColor: "#4CC496",
  color: "#fff",
  fontWeight: "bold",
};
const dgHeaderSx = {
  "& .MuiDataGrid-columnHeader": { backgroundColor: "#4CC496", color: "#fff" },
  "& .MuiDataGrid-columnHeaderTitle": { fontWeight: "bold" },
  "& .MuiDataGrid-columnHeaderCheckbox .MuiCheckbox-root": { color: "#fff" },
  "& .MuiDataGrid-columnHeaderCheckbox": {
    "& .MuiDataGrid-columnHeaderTitleContainer::after": {
      content: '"選択"',
      color: "#fff",
      fontWeight: "bold",
      fontSize: 14,
    },
    "& .MuiCheckbox-root": { display: "none" },
  },
};

const Processes: React.FC = () => {
  const [mode, setMode] = useState<PageMode>("view");
  const isEditMode = mode === "edit";

  const [processes, setProcesses] = useState<Process[]>([]);
  const [allParts, setAllParts] = useState<Part[]>([]);
  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>({
    type: "include" as const,
    ids: new Set<string>(),
  });

  // 登録フォーム
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [itemName, setItemName] = useState("");
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);

  const requiredPartOptions = allParts.filter((p) => p.type !== "product");

  const [editingBomId, setEditingBomId] = useState("");
  const [editingItems, setEditingItems] = useState<EditingItem[]>([]);

  const handleModeChange = (nextMode: PageMode) => {
    setMode(nextMode);
    if (nextMode === "view") {
      setShowRegisterForm(false);
      setSelectedRows({ type: "include", ids: new Set() });
    }
  };

  const handleOpenItemEditor = (row: Process) => {
    setEditingBomId(row.id);
    setEditingItems(
      Object.entries(row.items).map(([n, qty]) => ({ name: n, qty })),
    );
  };

  // 修正後
  const handleSaveItems = async () => {
    const target = processes.find((p) => p.id === editingBomId);
    if (!target) return;
    const newItems = Object.fromEntries(
      editingItems.map((i) => [i.name, Number(i.qty)])
    );
    try {
      const response = await fetch("http://localhost:3141/api/master/update-bom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bom_id: target.id,
          bom_name: target.name,
          bom_description: target.description,
          item_name: target.itemName,
          items: newItems,
        }),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "更新に失敗しました");
      }
      await handleGetAllBoms();
      setEditingBomId("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "更新に失敗しました。");
    }
  };

  const handleAddItem = () => {
    setEditingItems((prev) => [...prev, { name: "", qty: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setEditingItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: "name" | "qty",
    value: any,
  ) => {
    setEditingItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    );
  };

  const handleGetAllParts = async () => {
    const response = await fetch("http://localhost:3141/api/master/parts");
    if (!response.ok) return;
    const json = await response.json();
    const rows = json.result ?? json;
    setAllParts(
      (rows || []).map((item: any) => ({
        id: item.part_id,
        name: item.item_name,
        type: item.item_type,
      })),
    );
  };

  const handleGetAllBoms = async () => {
    const response = await fetch("http://localhost:3141/api/master/boms", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) throw new Error("工程一覧の取得に失敗しました");
    const json = await response.json();
    const rows = json.result ?? json;
    setProcesses(
      (rows || []).map((item: any) => ({
        id: item.bom_id,
        name: item.bom_name,
        description: item.bom_description,
        itemName: item.item_name,
        items: item.items ?? {},
      })),
    );
  };

  // 登録
  const handleAddProcess = async () => {
    if (!name.trim()) {
      alert("工程名を入力してください。");
      return;
    }
    if (!itemName) {
      alert("製作する製品名を選択してください。");
      return;
    }
    if (selectedParts.length === 0) {
      alert("部品を1つ以上選択してください。");
      return;
    }

    const items: { [key: string]: number } = {};
    for (const p of selectedParts) {
      items[p.name] = p.qty;
    }

    const response = await fetch("http://localhost:3141/api/master/add-bom", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bom_name: name,
        item_name: itemName,
        bom_description: description,
        items,
      }),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "登録に失敗しました");
    }
    setName("");
    setDescription("");
    setItemName("");
    setSelectedParts([]);
    setShowRegisterForm(false);
    await handleGetAllBoms();
  };

  // 削除
  const handleDelete = async () => {
    if (selectedRows.ids.size === 0) return;
    const bomIds = Array.from(selectedRows.ids);
    if (!window.confirm(`選択した${bomIds.length}件を削除しますか？`)) return;
    try {
      const response = await fetch(
        "http://localhost:3141/api/master/delete-boms",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bom_ids: bomIds }),
        },
      );
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error ?? "削除に失敗しました");
      }
      setSelectedRows({ type: "include", ids: new Set() });
      await handleGetAllBoms();
    } catch (err) {
      alert(err instanceof Error ? err.message : "削除に失敗しました。");
    }
  };

  const handleProcessRowUpdate = async (
    newRow: Process,
    oldRow: Process,
  ): Promise<Process> => {
    const response = await fetch(
      "http://localhost:3141/api/master/update-bom",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bom_id: newRow.id,
          bom_name: newRow.name,
          bom_description: newRow.description,
          item_name: newRow.itemName,
          items: newRow.items,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error ?? "更新に失敗しました");
    }

    setProcesses((prev) => prev.map((p) => (p.id === newRow.id ? newRow : p)));
    return newRow;
  };

  const handleItemNameChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setItemName(val);
    setSelectedParts((prev) => prev.filter((p) => p.name !== val));
  };

  const handleTogglePart = (part: Part) => {
    setSelectedParts((prev) => {
      const exists = prev.find((p) => p.name === part.name);
      if (exists) return prev.filter((p) => p.name !== part.name);
      return [...prev, { name: part.name, qty: 1 }];
    });
  };

  const handleQtyChange = (partName: string, qty: number) => {
    setSelectedParts((prev) =>
      prev.map((p) => (p.name === partName ? { ...p, qty } : p)),
    );
  };

  useEffect(() => {
    handleGetAllParts();
    handleGetAllBoms();
  }, []);

  // カラム定義（必要部品列は編集ボタンを表示）
  const columns: GridColDef<Process>[] = [
    {
      field: "name",
      headerName: "工程名",
      width: 150,
      editable: true,
    },
    {
      field: "itemName",
      headerName: "完成品名",
      width: 180,
      editable: false,
      renderCell: (params) => {
        if (!isEditMode) return <span>{params.row.itemName}</span>;

        // 自分以外のBOMで使われている itemName 一覧
        const usedItemNames = processes
          .filter((p) => p.id !== params.row.id)
          .map((p) => p.itemName);

        // 選択肢：中間品・完成品のみ、かつ他BOMで使用済みのものは除外
        const options = allParts.filter(
          (p) =>
            (p.type === "product" || p.type === "intermediate") &&
            !usedItemNames.includes(p.name),
        );

        return (
          <select
            value={params.row.itemName}
            onChange={async (e) => {
              const updated: Process = {
                ...params.row,
                itemName: e.target.value,
              };
              try {
                await handleProcessRowUpdate(updated, params.row);
              } catch (err) {
                alert(
                  err instanceof Error ? err.message : "更新に失敗しました。",
                );
              }
            }}
            style={{ width: "100%", padding: "4px 2px", fontSize: 14 }}
          >
            {/* 現在値が選択肢にない場合（削除済みなど）も表示できるよう保持 */}
            {!options.find((p) => p.name === params.row.itemName) &&
              params.row.itemName && (
                <option value={params.row.itemName}>
                  {params.row.itemName}
                </option>
              )}
            {options.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}（{p.type === "product" ? "完成品" : "中間品"}）
              </option>
            ))}
          </select>
        );
      },
    },
    {
      field: "description",
      headerName: "説明",
      flex: 1,
      sortable: false,
      editable: true,
    },
    {
      field: "items",
      headerName: "必要部品",
      flex: 1.2,
      sortable: false,
      editable: false,
      renderCell: (params) =>
        isEditMode ? (
          <button
            type="button"
            onClick={() => handleOpenItemEditor(params.row)}
            style={{
              background: GREEN,
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "4px 10px",
              cursor: "pointer",
            }}
          >
            編集
          </button>
        ) : (
          <span>
            {Object.entries(params.row.items)
              .map(([n, q]) => `${n} × ${q}`)
              .join("、")}
          </span>
        ),
    },
  ];

  return (
    <div style={{ maxWidth: "100%", padding: 16, boxSizing: "border-box" }}>
      <h2>工程ページ</h2>
      <ModeToolbar
        mode={mode}
        selectedCount={selectedRows.ids.size}
        onModeChange={handleModeChange}
        onAdd={() => setShowRegisterForm((prev) => !prev)}
        onDelete={handleDelete}
        onRefresh={() => {
          handleGetAllParts();
          handleGetAllBoms();
        }}
      />

      {/* 登録フォーム */}
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
          <h3 style={{ marginTop: 0 }}>新規工程登録</h3>
          <div style={{ display: "grid", gap: 12 }}>
            <label>
              製作する製品名
              <select
                value={itemName}
                onChange={handleItemNameChange}
                style={{
                  width: "100%",
                  padding: 8,
                  marginTop: 4,
                  boxSizing: "border-box",
                }}
              >
                <option value="">選択してください</option>
                {allParts
                  .filter(
                    (p) => p.type === "product" || p.type === "intermediate",
                  )
                  .map((part) => (
                    <option key={part.id} value={part.name}>
                      {part.name}（
                      {part.type === "product" ? "完成品" : "中間品"}）
                    </option>
                  ))}
              </select>
            </label>
            <label>
              工程名
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="工程名を入力"
                style={{
                  width: "100%",
                  padding: 8,
                  marginTop: 4,
                  boxSizing: "border-box",
                }}
              />
            </label>
            <label>
              説明
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="工程の説明を入力"
                rows={3}
                style={{
                  width: "100%",
                  padding: 8,
                  marginTop: 4,
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </label>
            <div>
              <p style={{ fontWeight: "bold", marginBottom: 8 }}>
                使用する部品を選択
              </p>
              <Paper sx={{ height: 631, width: "100%" }}>
                <DataGrid
                  rows={allParts
                    .filter(
                      (p) =>
                        p.name !== itemName &&
                        (p.type === "part" || p.type === "intermediate"),
                    )
                    .map((part, idx) => ({
                      id: idx,
                      partId: part.id,
                      name: part.name,
                      type: part.type,
                      selected: !!selectedParts.find(
                        (p) => p.name === part.name,
                      ),
                      qty:
                        selectedParts.find((p) => p.name === part.name)?.qty ??
                        1,
                    }))}
                  columns={[
                    {
                      field: "selected",
                      headerName: "選択",
                      width: 80,
                      sortable: false,
                      resizable: false,
                      hideable: false,
                      filterable: false,
                      renderCell: (params) => (
                        <input
                          type="checkbox"
                          checked={params.row.selected}
                          onChange={() =>
                            handleTogglePart(
                              allParts.find((p) => p.id === params.row.partId)!,
                            )
                          }
                        />
                      ),
                    },
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
                      valueFormatter: (v) =>
                        v === "intermediate" ? "中間品" : "部品",
                    },
                    {
                      field: "qty",
                      headerName: "数量",
                      width: 100,
                      sortable: false,
                      resizable: false,
                      hideable: false,
                      renderCell: (params) => (
                        <input
                          type="number"
                          min={1}
                          value={params.row.qty}
                          disabled={!params.row.selected}
                          onChange={(e) =>
                            handleQtyChange(
                              params.row.name,
                              Number(e.target.value),
                            )
                          }
                          style={{ width: 70, padding: 4 }}
                        />
                      ),
                    },
                  ]}
                  initialState={{
                    pagination: { paginationModel: { page: 0, pageSize: 10 } },
                  }}
                  pageSizeOptions={[10, 20, 50]}
                  sx={{
                    border: 0,
                    "& .MuiDataGrid-cell": {
                      display: "flex",
                      alignItems: "center",
                    },
                    ...dgHeaderSx,
                  }}
                />
              </Paper>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await handleAddProcess();
                  } catch (err) {
                    alert(
                      err instanceof Error
                        ? err.message
                        : "登録に失敗しました。",
                    );
                  }
                }}
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

      <MasterDataGrid<Process>
        rows={processes}
        columns={columns}
        mode={mode}
        selectedRows={selectedRows}
        onSelectedRowsChange={setSelectedRows}
        onRowUpdate={handleProcessRowUpdate}
        onRowClick={(row) => {
          if (!isEditMode) return;
          setShowRegisterForm(false);
        }}
      />

      {/* 必要部品編集ダイアログ */}
      <Dialog
        open={editingBomId !== ""}
        onClose={() => setEditingBomId("")}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>必要部品を編集</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper} style={{ marginTop: 8 }}>
            <Table sx={{ minWidth: 400 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={headerStyle}>部品名</TableCell>
                  <TableCell sx={headerStyle}>数量</TableCell>
                  <TableCell sx={headerStyle}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {editingItems.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <select
                        value={item.name}
                        onChange={(e) =>
                          handleItemChange(index, "name", e.target.value)
                        }
                        style={{ width: "100%", padding: 6 }}
                      >
                        <option value="">選択してください</option>
                        {requiredPartOptions.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}（
                            {p.type === "intermediate" ? "中間品" : "部品"}）
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <input
                        type="number"
                        min={1}
                        value={item.qty}
                        onChange={(e) =>
                          handleItemChange(index, "qty", Number(e.target.value))
                        }
                        style={{ width: 70, padding: 4 }}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        style={{
                          padding: "4px 8px",
                          backgroundColor: "#d32f2f",
                          color: "#fff",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                        }}
                      >
                        削除
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <button
            type="button"
            onClick={handleAddItem}
            style={{
              padding: "6px 14px",
              borderRadius: 4,
              cursor: "pointer",
              border: "1px solid #ccc",
            }}
          >
            追加
          </button>
          <button
            type="button"
            onClick={handleSaveItems}
            style={{
              padding: "6px 14px",
              background: GREEN,
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => setEditingBomId("")}
            style={{
              padding: "6px 14px",
              borderRadius: 4,
              cursor: "pointer",
              border: "1px solid #ccc",
            }}
          >
            キャンセル
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Processes;
