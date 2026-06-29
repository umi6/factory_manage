// 遺産（負ではない）　一応とっておこう
// import React, { useEffect, useState } from "react";

// import Paper from "@mui/material/Paper";

// import { DataGrid } from "@mui/x-data-grid";
// import type { GridColDef, GridRowSelectionModel, } from "@mui/x-data-grid";
// type Part = {
//     id: string;
//     name: string;
//     type: string;
// };

// const typeOptions = [
//     { value: 'part', label: '部品' },
//     { value: 'intermediate', label: '中間品' },
//     { value: 'product', label: '完成品' },
// ];

// const EditParts: React.FC = () => {
//     const [parts, setParts] = useState<Part[]>([]);
//     const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>({
//         type: "include",
//         ids: new Set(),
//     });

//     const handleGetAllParts = async () => {
//         const response = await fetch("http://localhost:3141/api/master/parts", {
//             method: "GET",
//             headers: { "Content-Type": "application/json" },
//         });
//         if (!response.ok) throw new Error("部品一覧の取得に失敗しました");
//         const json = await response.json();
//         const rows = json.result ?? json;
//         setParts((rows || []).map((item: any) => ({
//             id: item.part_id,
//             name: item.item_name,
//             type: item.item_type,
//         })));
//     };

//     const handleDelete = async () => {
//         if (selectedRows.ids.size === 0) return;
//         const itemNames = parts
//             .filter((p) => selectedRows.ids.has(p.id))
//             .map((p) => p.name);
//         if (!window.confirm(`${itemNames.length}件の部品を削除しますか？`)) return;

//         try {
//             const response = await fetch("http://localhost:3141/api/master/delete-parts", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({ item_names: itemNames }),
//             });
//             if (!response.ok) {
//                 const error = await response.json().catch(() => ({}));
//                 throw new Error(error.error ?? "削除に失敗しました");
//             }
//             alert("削除しました。");
//             await handleGetAllParts();
//             setSelectedRows({ type: "include", ids: new Set() });
//         } catch (err) {
//             alert(err instanceof Error ? err.message : "削除に失敗しました。");
//         }
//     };

//     const handleProcessRowUpdate = async (
//         newRow: Part,
//         oldRow: Part
//     ): Promise<Part> => {

//         const params = new URLSearchParams();

//         // 必須
//         params.append("part_id", newRow.id);

//         // 変更があった項目だけ送る
//         if (newRow.name !== oldRow.name) {
//             params.append("item_name", newRow.name);
//         }

//         if (newRow.type !== oldRow.type) {
//             params.append("item_type", newRow.type);
//         }

//         const query = params.toString();
//         const response = await fetch(
//             `http://localhost:3141/api/master/update-part?${query}`,
//             {
//                 method: "POST",
//             }
//         );

//         if (!response.ok) {
//             const error = await response.json().catch(() => ({}));
//             throw new Error(error.error ?? "更新に失敗しました");
//         }

//         // 画面のデータも更新
//         setParts((prev) =>
//             prev.map((p) => (p.id === newRow.id ? newRow : p))
//         );

//         return newRow;
//     };

//     useEffect(() => { handleGetAllParts(); }, []);

//     const columns: GridColDef[] = [
//         {
//             field: "id",
//             headerName: "ID",
//             width: 150,
//             sortable: false,
//             resizable: false,
//         },
//         {
//             field: "name",
//             headerName: "部品名",
//             flex: 1,
//             resizable: false,
//             editable: true,  // ダブルクリックで編集
//         },
//         {
//             field: "type",
//             headerName: "種別",
//             width: 150,
//             resizable: false,
//             editable: true,
//             type: "singleSelect",
//             valueOptions: typeOptions.map((o) => ({ value: o.value, label: o.label })),
//             valueFormatter: (value) => {
//                 const opt = typeOptions.find((o) => o.value === value);
//                 return opt ? opt.label : value;
//             },
//         },
//     ];

//     return (
//         <div style={{ maxWidth: "100%", padding: 16, boxSizing: "border-box" }}>
//             <h2>部品一覧・編集ページ</h2>

//             <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
//                 {selectedRows.ids.size > 0 && (
//                     <button
//                         type="button"
//                         onClick={handleDelete}
//                         onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#b71c1c"; }}
//                         onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#d32f2f"; }}
//                         style={{
//                             padding: "10px 16px",
//                             width: 200,
//                             backgroundColor: "#d32f2f",
//                             color: "#fff",
//                             border: "none",
//                             borderRadius: 4,
//                             cursor: "pointer",
//                         }}
//                     >
//                         選択した{selectedRows.ids.size}件を削除
//                     </button>
//                 )}
//                 <button
//                     type="button"
//                     onClick={handleGetAllParts}
//                     style={{ padding: "10px 16px", width: 100, borderRadius: 4, cursor: "pointer" }}
//                 >
//                     更新
//                 </button>
//             </div>

//             <Paper sx={{ height: 550, width: "100%" }}>
//                 <DataGrid
//                     rows={parts}
//                     columns={columns}
//                     checkboxSelection
//                     disableRowSelectionOnClick

//                     processRowUpdate={handleProcessRowUpdate}
//                     onProcessRowUpdateError={(error) => {
//                         alert(String(error));
//                     }}

//                     rowSelectionModel={selectedRows}
//                     onRowSelectionModelChange={(s) => setSelectedRows(s)}

//                     initialState={{
//                         pagination: {
//                             paginationModel: {
//                                 page: 0,
//                                 pageSize: 10,
//                             },
//                         },
//                     }}
//                     pageSizeOptions={[10, 20, 50]}
//                 />
//             </Paper>
//             <p style={{ color: '#999', fontSize: 12, marginTop: 8 }}>※ セルをダブルクリックで編集できます</p>
//         </div>
//     );
// };

// export default EditParts;