---
title: "【prismatix-input】初めてossを公開した"
emoji: "🚀"
type: "tech"
published: false
published_at: "2025-08-27 15:43"
---
# 作ったもの
webの入力を統合・拡張的に扱えるシンプルなライブラリです。
prismatix-inpuといいます。
https://www.npmjs.com/package/@starlivia/prismatix-input
[サンプルページ](https://stackblitz.com/edit/prismatix-input-playground?file=src%2Fmain.ts)
rxjsやmittのイベントにイイカンジ接続して扱えるほか、キーマップに対応しています。
# なぜ作ったのか
[マジカルミライ2025プログラミングコンテスト](https://magicalmirai.com/2025/procon/)に出るにあたり、幅広いデバイスの入力でインタラクティブ・分析をすることをしていました。
この辺、汎用的に使えそうだな～OSSやってみたかったしやるか～ということで。機能的には色々と死産なのですが、それはまた別の話。
# OSS公開に当たり思ったこと
## npmの公開が罠
公開自体はめっちゃ簡単にできたしnpmすげーという感想なのですが、
- メールアドレスが公開される
- organization?namespace?の概念がやや手間
- (公開したものが二度と消えない)
当たりが落とし穴だな～と思いました。

playgroundが動かない
aiを使うなどしているハナシ
気分の話

![Pasted image 20250829154310](/images/Pasted%20image%2020250829154310.png)