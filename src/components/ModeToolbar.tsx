export type PageMode = "view" | "edit";

type ModeToolbarProps = {
  mode: PageMode;
  selectedCount?: number;
  onModeChange: (mode: PageMode) => void;
  onAdd?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;
};

const ModeToolbar = ({
  mode,
  selectedCount = 0,
  onModeChange,
  onAdd,
  onDelete,
  onRefresh,
}: ModeToolbarProps) => {
  const isEditMode = mode === "edit";

  const iconButtonStyle: React.CSSProperties = {
    width: 40,
    height: 40,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #ccc",
    borderRadius: 4,
    cursor: "pointer",
  };

  return (
    <div
      style={{
        width: "100%",
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "inline-flex", marginRight: 8 }}>
          <button
            type="button"
            onClick={() => onModeChange("view")}
            title="閲覧モード"
            aria-label="閲覧モード"
            style={{
              width: 40,
              height: 40,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #ccc",
              borderRight: "none",
              borderRadius: "4px 0 0 4px",
              backgroundColor: mode === "view" ? "var(--accent-color)" : "#fff",
              color: mode === "view" ? "#fff" : "#000",
              cursor: "pointer",
            }}
          >
            <i className="fa-solid fa-eye" />
          </button>

          <button
            type="button"
            onClick={() => onModeChange("edit")}
            title="編集モード"
            aria-label="編集モード"
            style={{
              width: 40,
              height: 40,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #ccc",
              borderRadius: "0 4px 4px 0",
              backgroundColor: mode === "edit" ? "var(--accent-color)" : "#fff",
              color: mode === "edit" ? "#fff" : "#000",
              cursor: "pointer",
            }}
          >
            <i className="fa-solid fa-pen" />
          </button>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        {onAdd && (
          <button
            type="button"
            disabled={!isEditMode || !onAdd}
            onClick={onAdd}
            title={isEditMode ? "新規登録" : "編集モードでのみ有効"}
            aria-label="新規登録"
            style={{
              padding: "10px 16px",
              backgroundColor: "var(--accent-color)",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: isEditMode ? "pointer" : "not-allowed",
              opacity: isEditMode ? 1 : 0.5,
            }}
          >
            <i className="fa-solid fa-plus" style={{ marginRight: 8 }} />
            追加
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            disabled={
              !isEditMode || selectedCount === 0 || onDelete === undefined
            }
            title={isEditMode ? "削除" : "編集モードでのみ有効"}
            aria-label="削除"
            style={{
              padding: "10px 16px",
              backgroundColor: "#e74c3c",
              color: "#fff",
              border: "none",
              borderRadius: 4,
              cursor: isEditMode ? "pointer" : "not-allowed",
              opacity: isEditMode ? 1 : 0.5,
            }}
          >
            <i className="fa-solid fa-trash" style={{ marginRight: 8 }} />
            選択した{selectedCount}件を削除
          </button>
        )}
      </div>
    </div>
  );
};

export default ModeToolbar;
