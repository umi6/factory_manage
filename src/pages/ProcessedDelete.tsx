import React, { useEffect, useState } from "react";

import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";

import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridRowSelectionModel, } from "@mui/x-data-grid";

type Process = {
    id: string;
    name: string;
    description: string;
    itemName: string;
    items: { [key: string]: number };
};

const DeleteProcesses: React.FC = () => {
    const [processes, setProcesses] = useState<Process[]>([]);
    const [selectedRows, setSelectedRows] =
        useState<GridRowSelectionModel>({
            type: "include" as const,
            ids: new Set<string>(),
        });

    const handleGetAllBoms = async () => {
        const response = await fetch("http://localhost:3141/api/master/boms", {
            method: "GET",
            headers: { "Content-Type": "application/json", },
        });

        if (!response.ok) {
            throw new Error("工程一覧の取得に失敗しました");
        }

        const json = await response.json();
        const rows = json.result ?? json;

        const data: Process[] = (rows || []).map((item: any) => ({
            id: item.bom_id,
            name: item.bom_name,
            description: item.bom_description,
            itemName: item.item_name,
            items: item.items,
        }));
        setProcesses(data);
    };

    useEffect(() => {
        handleGetAllBoms();
    }, []);

    const columns: GridColDef[] = [
        {
            field: "id",
            headerName: "ID",
            width: 100,
            sortable: false,
            resizable: false,
        },
        {
            field: "name",
            headerName: "工程名",
            width: 180,
            // sortable: false,
            resizable: false,
        },
        {
            field: "itemName",
            headerName: "完成品名",
            width: 180,
            // sortable: false,
            resizable: false,
        },
        {
            field: "description",
            headerName: "説明",
            flex: 1,
            sortable: false,
            resizable: false,
        },
        {
            field: "items",
            headerName: "必要部品",
            flex: 1.3,
            sortable: false,
            resizable: false,

            valueGetter: (_, row) =>
                Object.entries(row.items)
                    .map(([name, qty]) => `${name} × ${qty}`)
                    .join("、"),
        },
    ];


    const handleDelete = async () => {
        console.log("① handleDelete開始");

        if (selectedRows.ids.size === 0) return;

        const bomIds = Array.from(selectedRows.ids);
        console.log("② 削除対象:", bomIds);

        if (!window.confirm(`選択した${bomIds.length}件を削除しますか？`)) { return; }

        try {
            console.log("③ fetch開始");

            const params = new URLSearchParams();
            bomIds.forEach((id) => {
                params.append("bom_ids", String(id));
            });

            console.log(params.toString());

            const response = await fetch(`http://localhost:3141/api/master/delete-boms`, {
                method: "POST",
                headers: { "Content-Type": "application/json", },
                body: JSON.stringify({ bom_ids: bomIds, }),
            });

            // console.log("④ response:", response.status);
            console.log("④ response");

            if (!response.ok) {
                const error = await response
                    .json()
                    .catch(() => ({}));
                throw new Error(
                    error.error ??
                    "工程の削除に失敗しました。"
                );
            }

            console.log("⑤ 削除成功");

            alert("工程を削除しました。");
            await handleGetAllBoms();

            setSelectedRows({
                type: "include",
                ids: new Set(),
            });

        } catch (error) {
            alert(
                error instanceof Error
                    ? error.message
                    : "工程の削除に失敗しました。"
            );
        }
    };

    return (
        <div
            style={{ maxWidth: "100%", padding: 16, boxSizing: "border-box", }}>
            <h2>工程削除ページ</h2>

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
                            transition: "background-color 0.2s ease",
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
                <DataGrid rows={processes}
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
                    }}

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

export default DeleteProcesses;