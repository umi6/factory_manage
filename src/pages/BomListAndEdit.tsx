import React, { useEffect, useState } from "react";

import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";

import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridRowSelectionModel, } from "@mui/x-data-grid";

type Part = { id: string; name: string; type: string };
type Process = {
    id: string;
    name: string;
    description: string;
    itemName: string;
    items: { [key: string]: number };
};
type EditingItem = { name: string; qty: number };

const headerStyle = { backgroundColor: '#6484e3', color: '#fff', fontWeight: 'bold' };

const EditProcesses: React.FC = () => {
    const [processes, setProcesses] = useState<Process[]>([]);
    const [allParts, setAllParts] = useState<Part[]>([]);
    const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>({
        type: "include" as const,
        ids: new Set<string>(),
    });

    // 編集中の工程
    const [editingProcess, setEditingProcess] = useState<Process | null>(null);
    const [editingItems, setEditingItems] = useState<EditingItem[]>([]);

    const handleGetAllParts = async () => {
        const response = await fetch("http://localhost:3141/api/master/parts");
        if (!response.ok) return;
        const json = await response.json();
        const rows = json.result ?? json;
        setAllParts((rows || [])
            .filter((item: any) => item.item_type !== 'product')
            .map((item: any) => ({
                id: item.part_id,
                name: item.item_name,
                type: item.item_type,
            }))
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
        setProcesses((rows || []).map((item: any) => ({
            id: item.bom_id,
            name: item.bom_name,
            description: item.bom_description,
            itemName: item.item_name,
            items: item.items ?? {},
        })));
    };

    const handleDelete = async () => {
        if (selectedRows.ids.size === 0) return;
        const bomIds = Array.from(selectedRows.ids);
        if (!window.confirm(`選択した${bomIds.length}件を削除しますか？`)) return;
        try {
            const response = await fetch("http://localhost:3141/api/master/delete-boms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ bom_ids: bomIds }),
            });
            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(error.error ?? "削除に失敗しました");
            }
            alert("削除しました。");
            await handleGetAllBoms();
            setSelectedRows({ type: "include", ids: new Set() });
            setEditingProcess(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : "削除に失敗しました。");
        }
    };

    // 工程行をクリックして編集モードに
    const handleRowClick = (process: Process) => {
        setEditingProcess(process);
        setEditingItems(
            Object.entries(process.items).map(([name, qty]) => ({ name, qty }))
        );
    };

    const handleAddItem = () => {
        setEditingItems((prev) => [...prev, { name: '', qty: 1 }]);
    };

    const handleRemoveItem = (index: number) => {
        setEditingItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: 'name' | 'qty', value: string | number) => {
        setEditingItems((prev) =>
            prev.map((item, i) => i === index ? { ...item, [field]: value } : item)
        );
    };

    // 編集保存（APIが揃ったら実装）
    // const handleSave = async () => {
    //     if (!editingProcess) return;
    //     const items: { [key: string]: number } = {};
    //     for (const item of editingItems) {
    //         if (item.name) items[item.name] = item.qty;
    //     }
    //     await fetch("http://localhost:3141/api/master/update-bom", {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({
    //             bom_id: editingProcess.id,
    //             bom_name: editingProcess.name,
    //             bom_description: editingProcess.description,
    //             item_name: editingProcess.itemName,
    //             items,
    //         }),
    //     });
    //     await handleGetAllBoms();
    //     setEditingProcess(null);
    // };

    useEffect(() => {
        handleGetAllParts();
        handleGetAllBoms();
    }, []);

    const columns: GridColDef[] = [
        { field: "id", headerName: "ID", width: 100, sortable: false, resizable: false },
        { field: "name", headerName: "工程名", width: 180, resizable: false },
        { field: "itemName", headerName: "完成品名", width: 180, resizable: false },
        { field: "description", headerName: "説明", flex: 1, sortable: false, resizable: false },
        {
            field: "items",
            headerName: "必要部品",
            flex: 1.3,
            sortable: false,
            resizable: false,
            valueGetter: (_, row) =>
                Object.entries(row.items).map(([name, qty]) => `${name} × ${qty}`).join("、"),
        },
    ];

    return (
        <div style={{ maxWidth: "100%", padding: 16, boxSizing: "border-box" }}>
            <h2>工程一覧・編集ページ</h2>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {selectedRows.ids.size > 0 && (
                    <button
                        type="button"
                        onClick={handleDelete}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#b71c1c"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#d32f2f"; }}
                        style={{
                            padding: "10px 16px",
                            width: 200,
                            backgroundColor: "#d32f2f",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                        }}
                    >
                        選択した{selectedRows.ids.size}件を削除
                    </button>
                )}
                <button
                    type="button"
                    onClick={handleGetAllBoms}
                    style={{ padding: "10px 16px", width: 100, borderRadius: 4, cursor: "pointer" }}
                >
                    更新
                </button>
            </div>

            <Paper sx={{ height: 400, width: "100%", marginBottom: 3 }}>
                <DataGrid
                    rows={processes}
                    columns={columns}
                    checkboxSelection
                    disableRowSelectionOnClick
                    disableColumnMenu
                    getRowHeight={() => "auto"}
                    sx={{
                        border: 0,
                        "& .MuiDataGrid-cell": {
                            whiteSpace: "normal",
                            wordBreak: "break-word",
                            lineHeight: "1.4 !important",
                            alignItems: "center",
                            display: "flex",
                            py: 1,
                        },
                        "& .MuiDataGrid-row": { cursor: "pointer" },
                    }}
                    rowSelectionModel={selectedRows}
                    onRowSelectionModelChange={(s) => setSelectedRows(s)}
                    onRowClick={(params) => handleRowClick(params.row)}
                    initialState={{ pagination: { paginationModel: { page: 0, pageSize: 10 } } }}
                    pageSizeOptions={[10, 20, 50]}
                />
            </Paper>

            {/* 編集パネル */}
            {editingProcess && (
                <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
                    <h3 style={{ marginTop: 0 }}>工程を編集：{editingProcess.name}</h3>

                    <div style={{ display: 'grid', gap: 12, marginBottom: 16 }}>
                        <label>
                            工程名
                            <input
                                type="text"
                                value={editingProcess.name}
                                onChange={(e) => setEditingProcess({ ...editingProcess, name: e.target.value })}
                                style={{ width: '100%', padding: 8, marginTop: 4 }}
                            />
                        </label>
                        <label>
                            完成品名
                            <input
                                type="text"
                                value={editingProcess.itemName}
                                onChange={(e) => setEditingProcess({ ...editingProcess, itemName: e.target.value })}
                                style={{ width: '100%', padding: 8, marginTop: 4 }}
                            />
                        </label>
                        <label>
                            説明
                            <textarea
                                value={editingProcess.description}
                                onChange={(e) => setEditingProcess({ ...editingProcess, description: e.target.value })}
                                rows={2}
                                style={{ width: '100%', padding: 8, marginTop: 4, resize: 'vertical' }}
                            />
                        </label>
                    </div>

                    <p style={{ fontWeight: 'bold', marginBottom: 8 }}>必要部品</p>
                    <TableContainer component={Paper} style={{ marginBottom: 12 }}>
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
                                                onChange={(e) => handleItemChange(index, 'name', e.target.value)}
                                                style={{ width: '100%', padding: 6 }}
                                            >
                                                <option value="">選択してください</option>
                                                {allParts.map((p) => (
                                                    <option key={p.id} value={p.name}>
                                                        {p.name}（{p.type === 'intermediate' ? '中間品' : '部品'}）
                                                    </option>
                                                ))}
                                            </select>
                                        </TableCell>
                                        <TableCell>
                                            <input
                                                type="number"
                                                min={1}
                                                value={item.qty}
                                                onChange={(e) => handleItemChange(index, 'qty', Number(e.target.value))}
                                                style={{ width: 70, padding: 4 }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(index)}
                                                style={{
                                                    padding: '4px 8px',
                                                    backgroundColor: '#d32f2f',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: 4,
                                                    cursor: 'pointer',
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

                    <div style={{ display: 'flex', gap: 8 }}>
                        <button
                            type="button"
                            onClick={handleAddItem}
                            style={{ padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}
                        >
                            部品を追加
                        </button>
                        <button
                            type="button"
                            // onClick={handleSave}  // APIが揃ったら有効化
                            style={{
                                padding: '8px 16px',
                                backgroundColor: '#6484e3',
                                color: '#fff',
                                border: 'none',
                                borderRadius: 4,
                                cursor: 'pointer',
                            }}
                        >
                            保存する
                        </button>
                        <button
                            type="button"
                            onClick={() => setEditingProcess(null)}
                            style={{ padding: '8px 16px', borderRadius: 4, cursor: 'pointer' }}
                        >
                            キャンセル
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EditProcesses;