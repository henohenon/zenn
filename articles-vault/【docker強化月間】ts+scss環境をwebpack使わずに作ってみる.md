---
slug: "b2b4dcbd5babc6"
emoji: "🐋"
date: "2024-08-02 19:31"
---

# やりたいこと
dockerを使って、環境に左右されないts+scss環境を作りたい。
- 前のプロジェクトでwebpack使ったのでなんとなく違うものを使ってみたい
- 逆張り的にpnpmを使ってるのでpnpmで動かしたい

# 現状
## やってること
### pnpm run build
ts: esbuild、scss: sass、(他ファイル: cpx)
の各種ビルドをconcurrentlyで結合。
### pnpm run dev
上のbuild+liveserver、esbuild/sassのwatchオプションでホットリロードっぽくしたもの。
### docker compose build
npm環境にpnpmをインストール、package.jsonコピってきてインストール、src以下とtsconfigをコピー。
### docker compose watch
ホストのファイルに変更があったら仮想環境も変更したりリビルドしたりしてくれる。

ファイルの同期をしつつpnpm run devを実行。
## 構成/ファイル
```:ディレクトリ構成
.
└── app/
    ├── dist
    ├── src/
    │   ├── assets
    │   ├── styles/
    │   │   └── index.scss
    │   └── ts/
    │       └── index.ts
    ├── Dockerfile
    ├── package.json
    ├── compose.yml
    └── tsconfig.json
```
```json:package.json
{
  "main": "index.js",
  "scripts": {
    "build:sass": "sass ./src/styles:dist/styles",
    "build:ts": "esbuild ./src/ts/index.ts --outfile=./dist/js/bundle.js --bundle",
    "copy:html": "cpx src/index.html dist",
    "copy:assets": "cpx src/assets/** dist/assets",
    "watch:sass": "sass --watch ./src/styles:dist/styles",
    "watch:ts": "esbuild ./src/ts/index.ts --outfile=./dist/js/bundle.js --bundle --watch --loader:.ts=ts",
    "watch:html": "cpx src/index.html dist --watch",
    "watch:assets": "cpx 'src/assets/**/*' dist/assets --watch",
    "server": "live-server dist",
    "watch": "concurrently \"pnpm run watch:sass\" \"pnpm run watch:ts\" \"pnpm run watch:html\" \"pnpm run watch:assets\"",
    "build": "concurrently \"pnpm run build:sass\" \"pnpm run build:ts\" \"pnpm run copy:html\" \"pnpm run copy:assets\"",
    "watch:npm": "concurrently \"npm run watch:sass\" \"npm run watch:ts\" \"npm run watch:html\" \"npm run watch:assets\"",
    "build:npm": "concurrently \"npm run build:sass\" \"npm run build:ts\" \"npm run copy:html\" \"npm run copy:assets\"",
    "dev": "concurrently \"pnpm run watch\" \"pnpm run server\"",
    "dev:npm": "concurrently \"npm run watch\" \"npm run server\""
  },
  "keywords": [],
  "author": "",
  "devDependencies": {
    "@types/node": "^22.0.0",
    "concurrently": "^8.2.2",
    "cpx": "^1.5.0",
    "esbuild": "^0.23.0",
    "live-server": "^1.2.2",
    "sass": "^1.77.8",
    "typescript": "^5.5.4"
  },
}
```
```Dockerfile:Dockerfile
# ベースイメージとしてnodeを使用
FROM node:20-alpine

# 作業ディレクトリを設定
WORKDIR /app

# package.jsonとpnpm-lock.yamlをコピー
COPY package.json ./

# pnpmをインストール
RUN npm install -g pnpm

# 依存関係をインストール
RUN pnpm install

# ソースコードをコピー
COPY src ./src
COPY tsconfig.json ./

# ポートを公開
EXPOSE 8080

# コンテナ起動時に実行するコマンド
CMD ["pnpm", "run", "dev"]
```
```yml:compose.yml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    develop:
      watch:
        - action: sync
          path: ./src
          target: /app/src
        - action: rebuild
          path: ./package.json
    ports:
      - "8080:8080"
    command: ["npm", "run", "dev"]
```

## 課題
- ビルド
    - 現状dockerでビルドしたものをホストに持ってこれない
    - 結局ホスト側でpnpm run buildしてる
    - ビルド用のdocker作るか、、distはホストに自動で反映されるようにするか...
- docker watchが怪しい
    - 起動したターミナルを離れるとwatchが止まる？...
        - 毎回起動すればいいが本末転倒感
    - ファイルの削除には対応してない？...
    - ※使い方が悪いだけなきはする
- その他ちょっと気になる
    - 複合コマンドがnpm/pnpmに限定される
    - src以下のフォルダ構成(特にts)がちょっと違う感
    - webpack(esbuild-loader)でよくね？
# 余談
dockerもcompose.ymlでよくなってたり、いろいろdockerも進化してるんやなぁ。ちなみにesbuildが早いかは検証してないのでわかんないです。はい。

いったん満足しちゃったのでここで供養しておきます。ビルドできないのは終わってるしどっかで帰ってくる気はする。
次はRemoteContainer(DevContainer)、esbuild-loader触りたいかな～。

#docker #esbuild #pnpm