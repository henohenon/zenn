---
slug: open-siv-3d-ui
emoji: 🐠
type: tech
published: false
date: 2025-12-09 12:00
---
  
この記事は[Siv3Dアドベントカレンダー2025](https://qiita.com/advent-calendar/2025/siv3d)の9日目の記事です！  
- 前回: https://qiita.com/HazukiKojima/items/cce24d666f7c83aed48f  
- 次回:（執筆時点では未定）  

# はじめに  
こんにちは！ゲームをメインに色々作ってるへのへのんです！  
  
今回は先日参加させてもらった[BNSカップ](https://bandainamcostudios.connpass.com/event/364446/)で作成したゲームについて、特にUI作成のテック的な観点から語る記事となります。  
# 概要  
https://scrapbox.io/bnscup2025/%E6%B7%B1%E6%B5%B7%E3%82%AE%E3%83%A7%E6%88%A6%E8%A8%98  
ゲームについてはここにまとめてあります！  
https://github.com/tukuruttyan/siv3d2025  
ソースコードはこちらから。※この記事のサンプルは上記とは異なり一部省略しているものがあります。

今回作ったUIはこんな感じです。  
。。。正直作り込みが追いついてないです；；ごめんなさい。  
![sinkaiui.gif](https://raw.githubusercontent.com/henohenon/zenn/refs/heads/main/articles-vault/sinkaiui.gif)  
# 具体的な実装  
今回は次の画像のように分割して解説していきます。  
![[Pasted-image_20251209192439.png]]  
https://github.com/tukuruttyan/siv3d2025/blob/main/siv3d2025/StageUI.cpp  
また実装は一部を覗いてほぼこのファイルだけで完結しています。500行というまぁまぁな行数ですが、関数でちゃんと区切ってはあるので一応読めるんじゃないかなーとは思ってます。updateから辿ってもらえれば。  
https://github.com/henohenon/zenn/blob/main/codes/open-siv-3d-ui.cpp#L6-L72
今回、[Transformer2D](https://siv3d.github.io/ja-jp/tutorial3/camera2d/#492-%E6%8F%8F%E7%94%BB%E5%BA%A7%E6%A8%99%E3%81%B8%E3%81%AE%E3%82%AA%E3%83%95%E3%82%BB%E3%83%83%E3%83%88%E9%81%A9%E7%94%A8transformer2d)を多用して作成を行いました。ざっくり親子関係、原点の変更という意味合いで自分は認識しています。関数化+これで大まかなパーツ分けを実現している他、記述のいち指定を単純にすることに(一部)成功している可と思います。  

https://github.com/tukuruttyan/siv3d2025/blob/main/siv3d2025/StageUI.h#L79-L87  
また、メジャーかもしれませんが今回作成するに辺り、ベースカラー、メインカラー・サブカラー、アクセントカラーなどを予め決めておくというアプローチを取りました。これは扱いやすい&見た目もまとまりやすく、結構イイカンジだったんじゃないかなと思っています。  
## 1. キリミボタン、パレット  
キリミと言われる、ユニットのパーツと、(表示がぶっ壊れてますが)現在のコストなどを表示するための場所  
### キリミボタン  
各キリミは独自ボタンとして[別実装](https://github.com/tukuruttyan/siv3d2025/blob/main/siv3d2025/KirimiButton.cpp)をしています。  
https://github.com/henohenon/zenn/blob/main/codes/open-siv-3d-ui.cpp#L86-L156
結構色々機能が詰め込まれた独自ボタン。ホバーとか自分で作るの結構(心理的に)しんどいので、拡張性に優れたUI系の機能かライブラリが欲しいところ(もしかして：明日の記事)。  
  
基本的にはアイコンとコストのあるボタンで、それに加えて何個そのキリミを使用可能か、次使用可能になるかををわかりやすくする機能がある感じ。(マウスホバーは機能していないかも。)  
### パレット
https://github.com/henohenon/zenn/blob/main/codes/open-siv-3d-ui.cpp#L159-L162
...リファクタが追いついてない～。本来は、updateとdrawはそもそもpubの関数の時点で分けてあげるべきな気もする。  
https://github.com/henohenon/zenn/blob/main/codes/open-siv-3d-ui.cpp#L165-L188
シンプル～ちなみに影だけ切り離してあるのは、パレット影→キャンバス→パレット本体の順で描画したかったため。  
## 2. キャンバス  
こっちはキメラを作るためのキャンバス。ここにキリミを配置する。かなり可変に動いて気持ち良い。  
https://github.com/henohenon/zenn/blob/main/codes/open-siv-3d-ui.cpp#L191-L249
https://github.com/henohenon/zenn/blob/main/codes/open-siv-3d-ui.cpp#L252-L342
な、長い。これでも省略してるんだけどな～。個別処理しなきゃな要素が多い。  

![[Pasted-image_20251210000303.png]]  
実はキャンバスの上下にはちょっとだけフェードが仕込んである。こういう作り込みいいよね。  
  
技術的には、[ScopedViewport2D](https://siv3d.github.io/ja-jp/tutorial3/2d-render-state/#4813-%E3%83%93%E3%83%A5%E3%83%BC%E3%83%9D%E3%83%BC%E3%83%88)を使うことで、シンプルに動的な見切れを実装できた。とても感謝  
## 3. 取って  
キャンバスの取って、Handle。  
https://github.com/henohenon/zenn/blob/main/codes/open-siv-3d-ui.cpp#L344-L388
事前にポリゴンを定義しておくことで、リアルタイムの不可を下げている。(実際に効果があるかはちゃんと試せてないけど、意志としてはそう。)  
## 4. レーダー  
https://github.com/henohenon/zenn/blob/main/codes/open-siv-3d-ui.cpp#L390-L453
  
本来はここに今作ってるキメラのステータスを表示させたかったのだ...ポ◯モンみたいな。。。  
https://siv3d.github.io/ja-jp/course/radar-chart/  
  
シンプルなものの組み合わせだが、moveByとかに微妙にクセが有り絶妙に苦戦した記憶。こういうのはgui欲しくなるかも。  
  
## 5. ミニマップ  
https://github.com/henohenon/zenn/blob/main/codes/open-siv-3d-ui.cpp#L455-L543
  
これも長い...影、中身くり抜き、拠点イメージ画像は取ってと同様に予めポリゴン化をしてある。フェードの調整とかがなかなか根性だった。なんかイイカンジに内側フェードな角丸の四角形とか台形とか書けてほしい～  
  
ちなみに本来はここに敵味方のユニット表示とかしたかった。  
# 終わりに  
遅刻になってしまい誠に申し訳ございません。。  
今回初めてちゃんと(？)siv3dで開発したのですが、前の印象通り取っつきやすく、2Dに置いては非常にｲｲｶﾝｼﾞなエンジンであると感じました。(今回ほぼロジック部分をメンバーがやってくれたというのもあり、自分はUIの部分しかさわれていませんが。)  
  
具体的には、機能・資料共に足りないと感じるタイミングは存在するのですが(どちらかというとUnityがコミュニティ強すぎ)、ドキュメントまで公式でサポートされている機能・apiはかなり使い勝手が良く、使っててなんだこのクソ機能！！！ってことはなく、違和感なく開発することができました。  
(ドキュメントちゃんと読めてなかったり、色々組み合わせようとすると癖があったりとちゃんと苦戦はしました)  
  
改めて、このような機会をいただきありがとうございます。今後とも開発を陰ながら応援させていただきます。