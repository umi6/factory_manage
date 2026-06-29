import express from "express";
import cors from "cors";

const app = express();

// JSONリクエストの解析
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:5173", // フロントエンドのURL
    methods: ["GET", "POST"], // 許可するHTTPメソッド
    allowedHeaders: ["Content-Type"], // 許可するヘッダー
  }),
);

// APIルートの設定
import { router } from "./router/taskRouter.tsx";
app.use("/api", router);

// サーバーの起動
app.listen(3141, () => {
  console.log("サーバーがポート3141で起動しました");
});
