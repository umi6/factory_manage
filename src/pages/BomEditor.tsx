import React, { useState, useEffect } from "react";

type Part = { id: string; name: string };
type BomTree = {
    [itemName: string]: { qty: number; req_items: BomTree | undefined };
};

// 後から共通コンポーネント: ACCENT に置き換え可
const ACCENT = "#4CC496";

const TreeNode: React.FC<{
    name: string;
    qty: number;
    tree: BomTree | undefined;
    isRoot?: boolean;
}> = ({ name, qty, tree, isRoot = false }) => {
    const [open, setOpen] = useState(true);
    const [childTree, setChildTree] = useState<BomTree | undefined>(tree);
    const [bomName, setBomName] = useState<string | null>(null);

    useEffect(() => { setChildTree(tree); }, [tree]);

    // 工程名を取得
    useEffect(() => {
        fetch(`http://localhost:3141/api/master/bom?item_name=${encodeURIComponent(name)}`)
            .then((r) => r.ok ? r.json() : null)
            .then((json) => {
                if (!json) return;
                const result = json.result ?? json;
                if (result?.bom_name) setBomName(result.bom_name);
            })
            .catch(() => { });
    }, [name]);

    // 部品でもBOMがあれば取得
    useEffect(() => {
        if (tree) return;
        fetch(`http://localhost:3141/api/master/bom-tree?item_name=${encodeURIComponent(name)}`)
            .then((r) => r.ok ? r.json() : null)
            .then((json) => { if (json?.result) setChildTree(json.result); })
            .catch(() => { });
    }, [name, tree]);

    const hasChildren = childTree && Object.keys(childTree).length > 0;

    return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {/* ルート以外の中間品は展開ボタンあり */}
                {!isRoot && hasChildren ? (
                    <span
                        onClick={() => setOpen((p) => !p)}
                        style={{
                            cursor: "pointer",
                            color: ACCENT,
                            fontSize: 18,
                            width: 20,
                            userSelect: "none",
                        }}
                    >
                        {open ? "▼" : "▶"}
                    </span>
                ) : (
                    <div style={{ width: 20 }} />
                )}

                {/* ノードラベル */}
                <div style={{
                    padding: "6px 12px",
                    borderRadius: 6,
                    backgroundColor: isRoot ? ACCENT : "#fff",
                    color: isRoot ? "#fff" : "#000",
                    fontWeight: isRoot || hasChildren ? "bold" : "normal",
                    fontSize: 14,
                    border: `1px solid ${isRoot ? ACCENT : "#ccc"}`,
                    whiteSpace: "nowrap",
                }}>
                    {name}
                    {!isRoot && (
                        <span style={{ marginLeft: 8, color: isRoot ? "#eee" : "#666", fontSize: 12 }}>
                            × {qty}
                        </span>
                    )}
                    <span style={{ marginLeft: 8, color: isRoot ? "#ddf" : "#999", fontSize: 11 }}>
                        {isRoot ? "完成品" : hasChildren ? "中間品" : "部品"}
                    </span>
                </div>
            </div>

            {/* 子ノード */}
            {hasChildren && (isRoot || open) && (
                <div style={{ display: "flex", flexDirection: "column", marginLeft: 32, marginTop: 6 }}>
                    {/* 工程名 */}
                    {bomName && (
                        <div style={{
                            marginBottom: 8, marginLeft: 10,
                            padding: "3px 10px",
                            border: `1px solid ${ACCENT}`,
                            borderRadius: 6,
                            color: ACCENT, fontSize: 12,
                            width: "fit-content",
                        }}>
                            工程: {bomName}
                        </div>
                    )}
                    <div style={{ display: "flex" }}>
                        <div style={{ width: 2, backgroundColor: "#ccc", marginRight: 12, borderRadius: 1 }} />
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {Object.entries(childTree!).map(([childName, { qty: childQty, req_items }]) => (
                                <TreeNode key={childName} name={childName} qty={childQty} tree={req_items} />
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const BomTreeView: React.FC = () => {
    const [products, setProducts] = useState<Part[]>([]);
    const [selectedProduct, setSelectedProduct] = useState("");
    const [bomTree, setBomTree] = useState<BomTree | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGetAllProducts = async () => {
        const response = await fetch("http://localhost:3141/api/master/parts");
        if (!response.ok) return;
        const json = await response.json();
        const rows = json.result ?? json;
        setProducts(
            (rows || [])
                .filter((item: any) => item.item_type === "product" || item.item_type === "intermediate")
                .map((item: any) => ({ id: item.part_id, name: item.item_name }))
        );
    };

    const handleProductChange = async (value: string) => {
        setSelectedProduct(value);
        setBomTree(null);
        setError(null);
        if (!value) return;

        setLoading(true);
        try {
            const response = await fetch(
                `http://localhost:3141/api/master/bom-tree?item_name=${encodeURIComponent(value)}`
            );
            if (!response.ok) {
                const err = await response.json().catch(() => ({}));
                setError(err.error ?? "BOMの取得に失敗しました");
                return;
            }
            const json = await response.json();
            setBomTree(json.result);
        } catch {
            setError("BOMの取得に失敗しました");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { handleGetAllProducts(); }, []);

    return (
        <div style={{ maxWidth: "100%", padding: 16, boxSizing: "border-box" }}>
            <h2>構成ツリー表示</h2>

            <label style={{ display: "block", marginBottom: 24 }}>
                完成品・中間品選択
                <select
                    value={selectedProduct}
                    onChange={(e) => handleProductChange(e.target.value)}
                    style={{ width: "100%", padding: 8, marginTop: 4 }}
                >
                    <option value="">完成品・中間品を選択してください</option>
                    {products.map((p) => (
                        <option key={p.id} value={p.name}>{p.name}</option>
                    ))}
                </select>
            </label>

            {loading && <p style={{ color: "#999" }}>読込中...</p>}
            {error && <p style={{ color: "#c62828" }}>{error}</p>}

            {!loading && selectedProduct && bomTree && (
                <div style={{
                    padding: 20,
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    backgroundColor: "#fafafa",
                    overflowX: "auto",
                }}>
                    <TreeNode name={selectedProduct} qty={1} tree={bomTree} isRoot />
                </div>
            )}
        </div>
    );
};

export default BomTreeView;