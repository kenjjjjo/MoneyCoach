# Render デプロイガイド

MoneyCoach アプリを [Render](https://render.com) にデプロイするための設定ファイルおよび準備が完了いたしました。

---

## 準備した設定ファイル

1. **`render.yaml`** (Render Blueprint設定)
   - リポジトリ接続時に全自動で Web Service として検出・構成されます。
2. **`Dockerfile` / `.dockerignore`**
   - コンテナ（Docker）ベースでのデプロイが必要な場合にも対応。
3. **`package.json`**
   - 本番起動用コマンド (`npm start`) を本番環境用に最適化。

---

## デプロイ手順 (2パターン)

### パターンA: Render Blueprint で簡単自動デプロイ（推奨）

1. **GitHub にコードをプッシュ**
   - 新規作成された `render.yaml` を含む変更を GitHub のリポジトリにプッシュします。
2. **Render にログイン**
   - [https://dashboard.render.com](https://dashboard.render.com) にアクセスしてログインします。
3. **Blueprint の作成**
   - ダッシュボード右上の **New +** ボタンから **Blueprint** を選択します。
   - MoneyCoach の GitHub リポジトリを選択します。
4. **デプロイ開始**
   - Service Name を確認し、**Apply** をクリックするとビルドとデプロイが自動的に開始されます。

---

### パターンB: 手動で Web Service を作成してデプロイ

1. **New Web Service の作成**
   - Render ダッシュボードの **New +** -> **Web Service** を選択。
   - MoneyCoach リポジトリを接続します。
2. **設定項目の入力**:
   - **Name**: `money-coach` (お好みの名前)
   - **Environment**: `Node`
   - **Region**: `Singapore` や `Oregon` など
   - **Branch**: `main` (または使用しているブランチ)
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
3. **環境変数の設定 (Environment Variables)**:
   - `NODE_ENV`: `production`
4. **Create Web Service** をクリックしてデプロイを開始します。

---

## 動作確認

デプロイ完了後、Render が発行する URL (例: `https://money-coach.onrender.com`) にアクセスすると、WebアプリおよびバックエンドAPI（tRPC）が一体化して動作します。
