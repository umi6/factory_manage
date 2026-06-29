import React, { useEffect, useState } from "react";

import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";

import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridRowSelectionModel, } from "@mui/x-data-grid";


type Part = {
    id: string;
    name: string;
    type?: string;
};

const DeleteParts: React.FC = () => {
    const [parts, setParts] = useState<Part[]>([]);
    const [selectedRows, setSelectedRows] =
        useState<GridRowSelectionModel>({
            type: "include",
            ids: new Set(),
        });

    const handleGetAllParts = async () => {
        const response = await fetch("http://localhost:3141/api/master/parts", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
            throw new Error("部品一覧の取得に失敗しました");
        }

        const json = await response.json();
        const rows = json.result ?? json;

        const data: Part[] = (rows || []).map((item: any) => ({
            id: item.part_id,
            name: item.item_name,
            type: item.item_type,
        }));
        setParts(data);
    };

    useEffect(() => {
        handleGetAllParts();
    }, []);

    const columns: GridColDef[] = [
        {
            field: "id",
            headerName: "ID",
            width: 150,
            sortable: false,
            resizable: false
        },
        {
            field: "name",
            headerName: "部品名",
            flex: 1,
            sortable: false,
            resizable: false
        },
        {
            field: "type",
            headerName: "種別",
            width: 150,
            resizable: false,

            valueGetter: (_, row) => {
                switch (row.type) {
                    case "product":
                        return "完成品";
                    case "intermediate":
                        return "中間品";
                    default:
                        return "部品";
                }
            },
        },
    ];

    const handleDelete = async () => {
        if (selectedRows.ids.size === 0) { return; }

        const itemNames = parts
            .filter((part) => selectedRows.ids.has(part.id))
            .map((part) => part.name);

        if (!window.confirm(`${itemNames.length}件の部品を削除しますか？`)) { return; }

        try {
            const response = await fetch("http://localhost:3141/api/master/delete-parts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ item_names: itemNames }),
            });

            if (!response.ok) {
                const error = await response
                    .json()
                    .catch(() => ({}));
                throw new Error(
                    error.error ??
                    "部品の削除に失敗しました。"
                );
            }

            alert("部品を削除しました。");
            await handleGetAllParts();

            setSelectedRows({
                type: "include",
                ids: new Set(),
            });

        } catch (error) {
            alert(
                error instanceof Error
                    ? error.message
                    : "部品の削除に失敗しました。"
            );
        }
    };

    return (
        <div
            style={{ maxWidth: "100%", padding: 16, boxSizing: "border-box" }}>
            <h2>部品削除ページ</h2>

            {selectedRows.ids.size > 0 && (
                <div
                    style={{
                        display: "flex",
                        gap: 8,
                        marginTop: 24,
                        marginBottom: 16,
                    }}
                >
                    <button
                        type="button"
                        onClick={handleDelete}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#b71c1c";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#d32f2f";
                        }}
                        style={{
                            padding: "10px 16px",
                            width: "200px",
                            backgroundColor: "#d32f2f",
                            color: "#fff",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                        }}
                    >
                        選択した{selectedRows.ids.size}件を削除
                    </button>
                </div>
            )}

            <Paper
                sx={{
                    height: 550,
                    width: "100%",
                }}
            >
                <DataGrid
                    rows={parts}
                    columns={columns}
                    checkboxSelection
                    disableRowSelectionOnClick

                    rowSelectionModel={selectedRows}
                    onRowSelectionModelChange={(newSelection) =>
                        setSelectedRows(newSelection)
                    }

                    // 1ページにデフォで10件表示だって
                    initialState={{
                        pagination: {
                            paginationModel: {
                                page: 0,
                                pageSize: 10,
                            },
                        },
                    }}
                    // 1ページに表示する件数の選択肢を指定だって
                    pageSizeOptions={[10, 20, 50]}
                />
            </Paper>
        </div>
    );
};

export default DeleteParts;