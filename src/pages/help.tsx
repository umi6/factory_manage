import React from "react";

const ACCENT = "#4CC496";

type Section = {
  title: string;
  path: string;
  description: string;
  note?: string;
};

const flow: { step: number; label: string; }[] = [
  { step: 1, label: "部品を登録する", },
  { step: 2, label: "工程を定義する", },
  { step: 3, label: "部品を入荷する", },
  { step: 4, label: "組み立てを記録する", },
  { step: 5, label: "完成品を出荷する", }
];

const sections: Section[] = [
  {
    title: "部品",
    path: "/parts",
    description:
      "部品・中間品・完成品のマスターデータを管理します。まずここで全ての部品を登録してください。種別は「部品」「中間品」「完成品」の3種類です。",
    note: "他のページで選べる部品はここの登録内容が元になります。最初に必ず登録してください。",
  },
  {
    title: "工程",
    path: "/processes",
    description:
      "完成品または中間品を作るための工程を登録します。「どの完成品を」「どの部品を使って」作るかを定義します。部品ページで登録した部品を選んで構成できます。",
  },
  {
    title: "構成",
    path: "/BomEditor",
    description:
      "中間品または完成品の構成をツリー形式で確認できます。どの部品がどの中間品・完成品に使われているかを視覚的に確認できます。",
  },
  {
    title: "入荷",
    path: "/ImportParts",
    description:
      "部品の入荷の記録を登録します。登録することで部品在庫が増えます。",
  },
  {
    title: "出荷",
    path: "/ExportParts",
    description:
      "完成品の出荷の記録を登録します。登録することで完成品在庫が減ります。",
  },
  {
    title: "組立",
    path: "/MakeRecord",
    description:
      "組立の実績を記録します。登録することで、部品在庫が減り、完成品在庫が増えます。",
  },
  {
    title: "在庫",
    path: "/Inventory",
    description: "現在の在庫状況を確認するページです。",
  },
];

const Help: React.FC = () => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [statusMessage, setStatusMessage] = React.useState("");

  const handleSerialize = async () => {
    try {
      setStatusMessage("serialize中です...");
      const response = await fetch("http://localhost:3141/api/serialize");
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || "serializeに失敗しました");
      }

      const jsonText = typeof body.result === "string"
        ? body.result
        : JSON.stringify(body.result, null, 2);
      const blob = new Blob([jsonText], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `ajichalle-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setStatusMessage("jsonを保存しました");
    } catch (e: any) {
      setStatusMessage(e.message || "serializeに失敗しました");
    }
  };

  const handleDeserializeClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeserialize = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      setStatusMessage("deserialise中です...");
      const jsonText = await file.text();
      JSON.parse(jsonText);

      const response = await fetch("http://localhost:3141/api/deserialize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ json: jsonText }),
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || "deserialiseに失敗しました");
      }

      setStatusMessage("jsonを読み込みました");
    } catch (e: any) {
      setStatusMessage(e.message || "deserialiseに失敗しました");
    }
  };

  return (
    <div
      style={{
        maxWidth: 800,
        padding: "24px 24px 48px",
        boxSizing: "border-box",
        fontFamily: "sans-serif",
        color: "#222",
      }}
    >
      <h2 style={{ marginBottom: 4 }}>使い方ガイド</h2>
      <p style={{ color: "#666", marginTop: 0, marginBottom: 32, fontSize: 14 }}>
        左のサイドメニューから各ページに移動できます。
      </p>

      {/* 基本の流れ */}
      <section style={{ marginBottom: 40 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: "bold",
            borderLeft: `4px solid ${ACCENT}`,
            paddingLeft: 10,
            marginBottom: 16,
          }}
        >
          基本の流れ
        </h3>
        <p style={{ fontSize: 14, color: "#444", marginBottom: 16 }}>
          以下の順番でデータを登録していくのが基本の使い方です。
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {flow.map((f, i) => (
            <div key={f.step} style={{ display: "flex", alignItems: "stretch" }}>
              {/* ステップライン */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: 32,
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    backgroundColor: ACCENT,
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: "bold",
                    flexShrink: 0,
                  }}
                >
                  {f.step}
                </div>
                {i < flow.length - 1 && (
                  <div
                    style={{
                      width: 2,
                      flex: 1,
                      backgroundColor: "#d0ede2",
                      margin: "4px 0",
                      minHeight: 24,
                    }}
                  />
                )}
              </div>
              <div style={{ paddingLeft: 12, paddingBottom: i < flow.length - 1 ? 20 : 0 }}>
                <div style={{ fontWeight: "bold", fontSize: 14, lineHeight: "28px" }}>
                  {f.label}
                </div>
                {/* <div style={{ fontSize: 12, color: "#888" }}>{f.page}</div> */}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 共通操作 */}
      <section style={{ marginBottom: 40 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: "bold",
            borderLeft: `4px solid ${ACCENT}`,
            paddingLeft: 10,
            marginBottom: 12,
          }}
        >
          マスタページ共通の操作
        </h3>
        <div
          style={{
            backgroundColor: "#f7fdfb",
            border: "1px solid #d0ede2",
            borderRadius: 8,
            padding: "14px 18px",
            fontSize: 14,
            lineHeight: 1.8,
            color: "#333",
          }}
        >
          <div>
            <strong>閲覧モード／編集モード：</strong>
            編集・登録・削除をするには、ボタンで編集モードに切り替えてから操作してください。
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>登録：</strong>
            編集モードで「＋追加」ボタンを押すと登録フォームが表示されます。
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>削除：</strong>
            編集モードで行をチェックし、削除ボタンを押します。
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>編集：</strong>
            編集モードでセルをダブルクリックすると直接編集できます。
          </div>
        </div>
      </section>

      {/* 各ページ説明 */}
      <section>
        <h3
          style={{
            fontSize: 15,
            fontWeight: "bold",
            borderLeft: `4px solid ${ACCENT}`,
            paddingLeft: 10,
            marginBottom: 16,
          }}
        >
          各ページの説明
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sections.map((s) => (
            <div
              key={s.path}
              style={{
                border: "1px solid #e0e0e0",
                borderRadius: 8,
                padding: "14px 18px",
                backgroundColor: "#fff",
              }}
            >
              <div
                style={{
                  fontWeight: "bold",
                  fontSize: 14,
                  marginBottom: 6,
                  color: "#111",
                }}
              >
                {s.title}
              </div>
              <div style={{ fontSize: 13, color: "#444", lineHeight: 1.7 }}>
                {s.description}
              </div>
              {s.note && (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: ACCENT,
                    backgroundColor: "#f0fdf8",
                    border: `1px solid ${ACCENT}`,
                    borderRadius: 4,
                    padding: "4px 10px",
                    display: "inline-block",
                  }}
                >
                  ※ {s.note}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginTop: 40 }}>
        <h3
          style={{
            fontSize: 15,
            fontWeight: "bold",
            borderLeft: `4px solid ${ACCENT}`,
            paddingLeft: 10,
            marginBottom: 16,
          }}
        >
        </h3>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            onClick={handleSerialize}
            style={{
              border: "none",
              borderRadius: 6,
              backgroundColor: ACCENT,
              color: "#fff",
              cursor: "pointer",
              fontSize: 14,
              fontWeight: "bold",
              padding: "10px 18px",
            }}
          >
            serialize
          </button>
          <button
            type="button"
            onClick={handleDeserializeClick}
            style={{
              border: `1px solid ${ACCENT}`,
              borderRadius: 6,
              backgroundColor: "#fff",
              color: ACCENT,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: "bold",
              padding: "9px 18px",
            }}
          >
            deserialise
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleDeserialize}
            style={{ display: "none" }}
          />
          {statusMessage && (
            <span style={{ color: "#666", fontSize: 13 }}>
              {statusMessage}
            </span>
          )}
        </div>
      </section>
    </div>
  );
};

export default Help;