type DemoPart = {
  part_id: string;
  item_name: string;
  item_type: "part" | "intermediate" | "product";
};

type DemoBom = {
  bom_id: string;
  bom_name: string;
  bom_description: string;
  item_name: string;
  items: Record<string, number>;
};

type DemoInputRecord = {
  name: string;
  qty: number;
  supplier: string;
  date: string;
};

type DemoOutputRecord = {
  name: string;
  qty: number;
  customer: string;
  date: string;
};

type DemoAchieveRecord = {
  achieve_id: string;
  item_name: string;
  qty: number;
  date: string;
};

type DemoState = {
  parts: DemoPart[];
  boms: DemoBom[];
  stocks: Record<string, number>;
  inputs: DemoInputRecord[];
  outputs: DemoOutputRecord[];
  achieves: DemoAchieveRecord[];
  counters: {
    part: number;
    bom: number;
    input: number;
    output: number;
    achieve: number;
  };
};

const STORAGE_KEY = "factory_manage_demo_state";

const createSeedState = (): DemoState => ({
  parts: [
    { part_id: "part-001", item_name: "ねじ", item_type: "part" },
    { part_id: "part-002", item_name: "ベースプレート", item_type: "part" },
    { part_id: "part-003", item_name: "モーター", item_type: "part" },
    { part_id: "part-004", item_name: "ケーブル", item_type: "part" },
    { part_id: "part-101", item_name: "サブユニットA", item_type: "intermediate" },
    { part_id: "part-201", item_name: "製品A", item_type: "product" },
  ],
  boms: [
    {
      bom_id: "bom-101",
      bom_name: "サブユニット組立",
      bom_description: "サブユニットAを構成する工程",
      item_name: "サブユニットA",
      items: {
        "ねじ": 4,
        "ベースプレート": 1,
      },
    },
    {
      bom_id: "bom-201",
      bom_name: "製品組立",
      bom_description: "製品Aを構成する工程",
      item_name: "製品A",
      items: {
        "サブユニットA": 1,
        "モーター": 1,
        "ケーブル": 2,
      },
    },
  ],
  stocks: {
    "ねじ": 120,
    "ベースプレート": 40,
    "モーター": 15,
    "ケーブル": 30,
    "サブユニットA": 8,
    "製品A": 6,
  },
  inputs: [
    { name: "ねじ", qty: 50, supplier: "Demo Supplier", date: "2026-06-28" },
    {
      name: "ベースプレート",
      qty: 20,
      supplier: "Demo Supplier",
      date: "2026-06-29",
    },
  ],
  outputs: [
    { name: "製品A", qty: 2, customer: "Sample Customer", date: "2026-07-01" },
  ],
  achieves: [
    { achieve_id: "achieve-001", item_name: "サブユニットA", qty: 4, date: "2026-07-02" },
    { achieve_id: "achieve-002", item_name: "製品A", qty: 2, date: "2026-07-03" },
  ],
  counters: {
    part: 202,
    bom: 202,
    input: 3,
    output: 2,
    achieve: 3,
  },
});

const jsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });

const normalizeName = (value: string) => value.trim();

const getState = (): DemoState => {
  if (typeof window === "undefined") {
    return createSeedState();
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const seed = createSeedState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  try {
    return JSON.parse(saved) as DemoState;
  } catch {
    const seed = createSeedState();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
};

const saveState = (state: DemoState) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const getBomByItemName = (state: DemoState, itemName: string) =>
  state.boms.find((bom) => bom.item_name === itemName);

const buildBomTree = (
  state: DemoState,
  itemName: string,
  visited: Set<string> = new Set(),
): Record<string, { qty: number; req_items: Record<string, any> | undefined }> => {
  if (visited.has(itemName)) {
    return {};
  }

  const bom = getBomByItemName(state, itemName);
  if (!bom) {
    return {};
  }

  const nextVisited = new Set(visited);
  nextVisited.add(itemName);

  return Object.entries(bom.items).reduce<
    Record<string, { qty: number; req_items: Record<string, any> | undefined }>
  >((tree, [childName, qty]) => {
    const childBom = getBomByItemName(state, childName);
    tree[childName] = {
      qty,
      req_items: childBom
        ? buildBomTree(state, childName, nextVisited)
        : undefined,
    };
    return tree;
  }, {});
};

const flattenLeafRequirements = (
  tree: Record<string, { qty: number; req_items: Record<string, any> | undefined }>,
  multiplier = 1,
  result: Record<string, number> = {},
) => {
  for (const [name, value] of Object.entries(tree)) {
    const totalQty = value.qty * multiplier;
    if (value.req_items && Object.keys(value.req_items).length > 0) {
      flattenLeafRequirements(value.req_items, totalQty, result);
    } else {
      result[name] = (result[name] ?? 0) + totalQty;
    }
  }
  return result;
};

const renameItemEverywhere = (
  state: DemoState,
  previousName: string,
  nextName: string,
) => {
  if (previousName === nextName) {
    return;
  }

  state.parts.forEach((part) => {
    if (part.item_name === previousName) {
      part.item_name = nextName;
    }
  });

  state.boms.forEach((bom) => {
    if (bom.item_name === previousName) {
      bom.item_name = nextName;
    }

    if (bom.items[previousName] !== undefined) {
      const qty = bom.items[previousName];
      delete bom.items[previousName];
      bom.items[nextName] = qty;
    }
  });

  if (state.stocks[previousName] !== undefined) {
    state.stocks[nextName] = state.stocks[previousName];
    delete state.stocks[previousName];
  }

  state.inputs.forEach((record) => {
    if (record.name === previousName) {
      record.name = nextName;
    }
  });

  state.outputs.forEach((record) => {
    if (record.name === previousName) {
      record.name = nextName;
    }
  });

  state.achieves.forEach((record) => {
    if (record.item_name === previousName) {
      record.item_name = nextName;
    }
  });
};

const pruneReferences = (state: DemoState, deletedNames: Set<string>) => {
  state.boms.forEach((bom) => {
    for (const key of Object.keys(bom.items)) {
      if (deletedNames.has(key)) {
        delete bom.items[key];
      }
    }
  });

  state.boms = state.boms.filter((bom) => !deletedNames.has(bom.item_name));
  state.parts = state.parts.filter((part) => !deletedNames.has(part.item_name));

  for (const name of deletedNames) {
    delete state.stocks[name];
  }
};

const nextId = (prefix: string, current: number) => `${prefix}-${String(current).padStart(3, "0")}`;

const getItemType = (state: DemoState, itemName: string) =>
  state.parts.find((part) => part.item_name === itemName)?.item_type;

const updateStockByTree = (state: DemoState, itemName: string, qty: number) => {
  const tree = buildBomTree(state, itemName);
  const leafRequirements = flattenLeafRequirements(tree, qty);

  for (const [leafName, requiredQty] of Object.entries(leafRequirements)) {
    state.stocks[leafName] = (state.stocks[leafName] ?? 0) - requiredQty;
    if (state.stocks[leafName] < 0) {
      throw new Error(`部品在庫が不足しています: ${leafName}`);
    }
  }

  state.stocks[itemName] = (state.stocks[itemName] ?? 0) + qty;
};

const handleGet = (state: DemoState, url: URL) => {
  const path = url.pathname.replace(/\/+$/, "");

  if (path === "/api/master/parts") {
    return jsonResponse({ result: state.parts });
  }

  if (path === "/api/master/boms") {
    return jsonResponse({ result: state.boms });
  }

  if (path === "/api/master/bom") {
    const itemName = url.searchParams.get("item_name");
    const bom = itemName ? getBomByItemName(state, itemName) : undefined;
    return bom ? jsonResponse({ result: bom }) : jsonResponse({ error: "BOMが見つかりません" }, 404);
  }

  if (path === "/api/master/bom-tree") {
    const itemName = url.searchParams.get("item_name");
    if (!itemName) {
      return jsonResponse({ error: "item_nameが必要です" }, 400);
    }
    return jsonResponse({ result: buildBomTree(state, itemName) });
  }

  if (path === "/api/item-stock") {
    const itemName = url.searchParams.get("item_name");
    return jsonResponse({ item_stock: itemName ? state.stocks[itemName] ?? 0 : 0 });
  }

  if (path === "/api/item-type") {
    const itemName = url.searchParams.get("item_name");
    if (!itemName) {
      return jsonResponse({ error: "item_nameが必要です" }, 400);
    }
    const itemType = getItemType(state, itemName);
    return itemType
      ? jsonResponse({ item_type: itemType })
      : jsonResponse({ error: "item_typeが見つかりません" }, 404);
  }

  if (path === "/api/item-makeable") {
    const itemName = url.searchParams.get("item_name");
    const itemQty = Number(url.searchParams.get("item_qty") ?? 1) || 1;
    if (!itemName) {
      return jsonResponse({ error: "item_nameが必要です" }, 400);
    }

    const tree = buildBomTree(state, itemName);
    const leafRequirements = flattenLeafRequirements(tree, itemQty);
    const makeable = Object.entries(leafRequirements).every(
      ([leafName, requiredQty]) => (state.stocks[leafName] ?? 0) >= requiredQty,
    );
    return jsonResponse({ itemMakeable: makeable });
  }

  if (path === "/api/all-inputs") {
    return jsonResponse({ result: state.inputs });
  }

  if (path === "/api/all-outputs") {
    return jsonResponse({ result: state.outputs });
  }

  if (path === "/api/all-achieves") {
    return jsonResponse({ result: state.achieves });
  }

  if (path === "/api/serialize") {
    return jsonResponse({ result: JSON.stringify(state, null, 2) });
  }

  if (path === "/api/bom-id") {
    const itemName = url.searchParams.get("item_name");
    const bom = itemName ? getBomByItemName(state, itemName) : undefined;
    return bom ? jsonResponse({ bom_id: bom.bom_id }) : jsonResponse({ error: "bom_idが見つかりません" }, 404);
  }

  if (path === "/api/bom-require-items") {
    const bomId = url.searchParams.get("bom_id");
    const bom = bomId ? state.boms.find((item) => item.bom_id === bomId) : undefined;
    return bom ? jsonResponse({ requireItems: bom.items }) : jsonResponse({ error: "requireItemsが見つかりません" }, 404);
  }

  return null;
};

const handlePost = async (state: DemoState, url: URL, request: Request) => {
  const path = url.pathname.replace(/\/+$/, "");

  if (path === "/api/master/add-part") {
    const itemName = normalizeName(url.searchParams.get("item_name") ?? "");
    const itemType = url.searchParams.get("item_type") as DemoPart["item_type"] | null;

    if (!itemName || !itemType) {
      return jsonResponse({ error: "item_name/item_typeが必要です" }, 400);
    }

    if (state.parts.some((part) => part.item_name === itemName)) {
      return jsonResponse({ error: "同名の部品が既に存在します" }, 400);
    }

    const part = {
      part_id: nextId("part", state.counters.part++),
      item_name: itemName,
      item_type: itemType,
    } satisfies DemoPart;

    state.parts.unshift(part);
    state.stocks[itemName] = state.stocks[itemName] ?? 0;
    saveState(state);
    return jsonResponse({ result: part });
  }

  if (path === "/api/master/delete-parts") {
    const body = (await request.json()) as { item_names?: string[] };
    const deletedNames = new Set((body.item_names ?? []).map(normalizeName));
    pruneReferences(state, deletedNames);
    saveState(state);
    return jsonResponse({ message: "部品を削除しました" });
  }

  if (path === "/api/master/update-part") {
    const partId = url.searchParams.get("part_id");
    const nextName = normalizeName(url.searchParams.get("item_name") ?? "");
    const nextType = url.searchParams.get("item_type") as DemoPart["item_type"] | null;

    if (!partId) {
      return jsonResponse({ error: "part_idが必要です" }, 400);
    }

    const part = state.parts.find((item) => item.part_id === partId);
    if (!part) {
      return jsonResponse({ error: "更新対象が見つかりません" }, 404);
    }

    if (nextName && nextName !== part.item_name) {
      if (state.parts.some((item) => item.item_name === nextName)) {
        return jsonResponse({ error: "同名の部品が既に存在します" }, 400);
      }
      renameItemEverywhere(state, part.item_name, nextName);
    }

    if (nextType) {
      part.item_type = nextType;
    }

    saveState(state);
    return jsonResponse({ result: part });
  }

  if (path === "/api/master/add-bom") {
    const body = (await request.json()) as {
      bom_name?: string;
      item_name?: string;
      bom_description?: string;
      items?: Record<string, number>;
    };

    const itemName = normalizeName(body.item_name ?? "");
    if (!body.bom_name || !itemName) {
      return jsonResponse({ error: "bom_name/item_nameが必要です" }, 400);
    }

    if (state.boms.some((bom) => bom.item_name === itemName)) {
      return jsonResponse({ error: "対象のBOMは既に存在します" }, 400);
    }

    const bom = {
      bom_id: nextId("bom", state.counters.bom++),
      bom_name: body.bom_name,
      bom_description: body.bom_description ?? "",
      item_name: itemName,
      items: body.items ?? {},
    } satisfies DemoBom;

    state.boms.unshift(bom);
    saveState(state);
    return jsonResponse({ result: bom });
  }

  if (path === "/api/master/delete-boms") {
    const body = (await request.json()) as { bom_ids?: string[] };
    const deletedIds = new Set(body.bom_ids ?? []);
    state.boms = state.boms.filter((bom) => !deletedIds.has(bom.bom_id));
    saveState(state);
    return jsonResponse({ message: "BOMを削除しました" });
  }

  if (path === "/api/master/update-bom") {
    const body = (await request.json()) as {
      bom_id?: string;
      bom_name?: string;
      bom_description?: string;
      item_name?: string;
      items?: Record<string, number>;
    };

    if (!body.bom_id) {
      return jsonResponse({ error: "bom_idが必要です" }, 400);
    }

    const bom = state.boms.find((item) => item.bom_id === body.bom_id);
    if (!bom) {
      return jsonResponse({ error: "更新対象が見つかりません" }, 404);
    }

    const nextItemName = normalizeName(body.item_name ?? bom.item_name);
    if (nextItemName !== bom.item_name) {
      if (state.boms.some((item) => item.item_name === nextItemName && item.bom_id !== bom.bom_id)) {
        return jsonResponse({ error: "対象のBOMは既に存在します" }, 400);
      }
      renameItemEverywhere(state, bom.item_name, nextItemName);
    }

    if (body.bom_name !== undefined) {
      bom.bom_name = body.bom_name;
    }
    if (body.bom_description !== undefined) {
      bom.bom_description = body.bom_description;
    }
    if (body.items !== undefined) {
      bom.items = body.items;
    }
    bom.item_name = nextItemName;

    saveState(state);
    return jsonResponse({ result: bom });
  }

  if (path === "/api/input") {
    const body = (await request.json()) as {
      partName?: string;
      supplier?: string;
      stock?: number;
      date?: string;
    };

    const name = normalizeName(body.partName ?? "");
    const qty = Number(body.stock ?? 0);
    if (!name || qty <= 0) {
      return jsonResponse({ error: "partName/stockが必要です" }, 400);
    }

    state.stocks[name] = (state.stocks[name] ?? 0) + qty;
    const record = {
      name,
      qty,
      supplier: body.supplier ?? "",
      date: body.date ?? new Date().toISOString().slice(0, 10),
    } satisfies DemoInputRecord;
    state.inputs.unshift(record);
    saveState(state);
    return jsonResponse({ stock: state.stocks[name] });
  }

  if (path === "/api/output") {
    const body = (await request.json()) as {
      productName?: string;
      qty?: number;
      date?: string;
      customer?: string;
    };

    const name = normalizeName(body.productName ?? "");
    const qty = Number(body.qty ?? 0);
    if (!name || qty <= 0) {
      return jsonResponse({ error: "productName/qtyが必要です" }, 400);
    }

    const stock = state.stocks[name] ?? 0;
    if (stock < qty) {
      return jsonResponse({ error: "在庫が不足しています" }, 400);
    }

    state.stocks[name] = stock - qty;
    state.outputs.unshift({
      name,
      qty,
      customer: body.customer ?? "",
      date: body.date ?? new Date().toISOString().slice(0, 10),
    });
    saveState(state);
    return jsonResponse({ message: "出荷しました" });
  }

  if (path === "/api/achieve") {
    const body = (await request.json()) as {
      item_name?: string;
      achievement_date?: string;
      achievement_qty?: number;
    };

    const name = normalizeName(body.item_name ?? "");
    const qty = Number(body.achievement_qty ?? 0);
    if (!name || qty <= 0) {
      return jsonResponse({ error: "item_name/achievement_qtyが必要です" }, 400);
    }

    const itemMakeable = (() => {
      const tree = buildBomTree(state, name);
      const leafRequirements = flattenLeafRequirements(tree, qty);
      return Object.entries(leafRequirements).every(
        ([leafName, requiredQty]) => (state.stocks[leafName] ?? 0) >= requiredQty,
      );
    })();

    if (!itemMakeable) {
      return jsonResponse({ error: "部品の在庫が不足しています" }, 400);
    }

    updateStockByTree(state, name, qty);
    state.achieves.unshift({
      achieve_id: nextId("achieve", state.counters.achieve++),
      item_name: name,
      qty,
      date: body.achievement_date ?? new Date().toISOString().slice(0, 10),
    });
    saveState(state);
    return jsonResponse({ message: "組立しました" });
  }

  if (path === "/api/deserialize") {
    const body = (await request.json()) as { json?: string };

    if (!body.json) {
      return jsonResponse({ error: "jsonが必要です" }, 400);
    }

    try {
      const parsed = JSON.parse(body.json) as DemoState;
      saveState(parsed);
      return jsonResponse({ message: "jsonを読み込みました" });
    } catch {
      return jsonResponse({ error: "jsonの解析に失敗しました" }, 400);
    }
  }

  return null;
};

const demoFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const request = input instanceof Request ? input : new Request(input, init);
  const url = new URL(request.url);

  if (!url.pathname.startsWith("/api/")) {
    return originalFetch(input, init);
  }

  if (request.method === "GET") {
    const response = handleGet(getState(), url);
    if (response) {
      return response;
    }
  }

  if (request.method === "POST") {
    const response = await handlePost(getState(), url, request.clone());
    if (response) {
      return response;
    }
  }

  return jsonResponse({ error: "デモモードで未対応のAPIです" }, 404);
};

let originalFetch: typeof fetch;

export const installDemoApi = () => {
  if (typeof window === "undefined") {
    return;
  }

  const globalWindow = window as Window & { __demoApiInstalled?: boolean };
  if (globalWindow.__demoApiInstalled) {
    return;
  }

  globalWindow.__demoApiInstalled = true;
  originalFetch = window.fetch.bind(window);
  window.fetch = demoFetch as typeof fetch;
  globalThis.fetch = demoFetch as typeof fetch;
};

export const isDemoMode = import.meta.env.VITE_USE_DEMO_DATA === "true";