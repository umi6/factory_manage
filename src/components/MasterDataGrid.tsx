import Paper from "@mui/material/Paper";
import { DataGrid } from "@mui/x-data-grid";
import type {
  GridColDef,
  GridRowSelectionModel,
  GridValidRowModel,
} from "@mui/x-data-grid";
import type { PageMode } from "./ModeToolbar";

type MasterDataGridProps<T extends GridValidRowModel> = {
  rows: T[];
  columns: GridColDef<T>[];
  mode?: PageMode;
  height?: number;
  selectedRows?: GridRowSelectionModel;
  onSelectedRowsChange?: (selection: GridRowSelectionModel) => void;
  onRowUpdate?: (newRow: T, oldRow: T) => Promise<T>;
  onRowClick?: (row: T) => void;
};

const MasterDataGrid = <T extends GridValidRowModel>({
  rows,
  columns,
  mode = "view",
  height = 631,
  selectedRows,
  onSelectedRowsChange,
  onRowUpdate,
  onRowClick,
}: MasterDataGridProps<T>) => {
  const isEditMode = mode === "edit";
  const controlledColumns = columns.map((column) => ({
    ...column,
    editable: isEditMode && column.editable,
    hideable: column.hideable ?? false,
    resizable: column.resizable ?? false,
  }));

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "100%",
        padding: 16,
        boxSizing: "border-box",
      }}
    >
      <Paper sx={{ height, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={controlledColumns}
          checkboxSelection={isEditMode}
          disableRowSelectionOnClick
          processRowUpdate={onRowUpdate}
          onProcessRowUpdateError={(error) => {
            alert(
              error instanceof Error ? error.message : "保存に失敗しました",
            );
          }}
          rowSelectionModel={selectedRows}
          onRowSelectionModelChange={onSelectedRowsChange}
          onRowClick={
            onRowClick ? (params) => onRowClick(params.row) : undefined
          }
          initialState={{
            pagination: {
              paginationModel: {
                page: 0,
                pageSize: 10,
              },
            },
          }}
          pageSizeOptions={[10, 20, 50]}
          sx={{
            "& .MuiDataGrid-columnHeader": {
              backgroundColor: "var(--secondary-color)",
              color: "#3a3a3a",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: "bold",
            },
            "& .MuiDataGrid-columnHeaderCheckbox .MuiCheckbox-root": {
              color: "#fff",
            },
            "& .MuiDataGrid-columnHeaderCheckbox": {
              "& .MuiDataGrid-columnHeaderTitleContainer::after": {
                content: '"選択"',
                color: "#fff",
                fontWeight: "bold",
                fontSize: 14,
              },
              "& .MuiCheckbox-root": {
                display: "none",
              },
            },
          }}
        />
      </Paper>
    </div>
  );
};

export default MasterDataGrid;
