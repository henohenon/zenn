---
slug: make-strune-ssg
emoji: 🪨
type: tech
published: true
date: 2025-12-18 10:33
---
https://qiita.com/advent-calendar/2025/iwakenlab

これはIwaken Lab.アドベントカレンダーの17日目の記事です！

# 概要
こちらが今回制作したもののリポジトリと実際のページです！

https://github.com/Project-Starlivia/Strune
https://project-starlivia.github.io/Strune/

なんちゃってではありますが、割とそれっぽくなってるんじゃないでしょうか。
特徴として、前々からちょっとやってみたかった階層化されたリンク集みたいなものを目指して作成してみました。

今回はこれのテック的な部分をコードをなぞりつつ書いていきます。

:::message  
Rust初心者が執筆しております。至らぬ点や、もしかすると大きな間違いがあるかもしれませんが、温かい目で見守っていただけると嬉しいです。  
（もしお気づきの点がありましたら、優しく教えていただけると大変励みになります！）  
:::
# Node
このNode型をベースとしてデータをロード、各ページを描画するものとなっています。
https://github.com/Project-Starlivia/Strune/blob/main/strune_core/src/node.rs#L6-L12
# ローダー
jsonとmarkdownのローダーが用意してあります。
## Json
シンプルJsonローダー
https://github.com/Project-Starlivia/Strune/blob/main/crates/loader/src/json.rs#L56-L66
## Markdown
jsonだけで十分っちゃ十分なのですが、個人的に色々使いまわしたいかもなーと思いちょっと頑張りました。
(ただ普通に時間かかったので、あまりよくなかったかも)

---
ファイルロード→塊ごとに分割
https://github.com/Project-Starlivia/Strune/blob/main/crates/loader/src/markdown.rs#L39-L64

![[Pasted-image_20251218105442.png]]
こんな感じで、<ヘッダ>+<その下のテキスト全部>みたいな形で分割します。

構文解析のライブラリはあるっぽいのでこっちでやったほうが幸せかもしれない。
https://github.com/johnlepikhin/markdown-tool

---
Node型への変換。さっきの塊のヘッダのレベルとヘッダ名で分岐して突っ込んでいきます。optionsをジェネリックにしたことを後悔しながら書いてました。
https://github.com/Project-Starlivia/Strune/blob/main/crates/loader/src/markdown.rs#L66-L103

---
一応各種プロパティ用のパースが切り替えられるようになってます。
https://github.com/Project-Starlivia/Strune/blob/main/crates/loader/src/markdown.rs#L108-L146
# 操作
オプショナルですが、デフォルトのNode型では貧弱なためいくつかのよく使うデータの拡張・操作をまとめています。
## fill_dependents
Node型には一方的な依存方向のデータ(dependencies)しかないため、逆方向のデータ(dependents)を自動作成する関数。
https://github.com/Project-Starlivia/Strune/blob/main/crates/operation/src/dependents.rs#L53-L72
内部はシンプルなマップ。

# label_slug_map
空白などを含む単語対策。
https://github.com/Project-Starlivia/Strune/blob/main/crates/operation/src/slug.rs#L52-L67

---
どちらかというと型解決に苦労しました。
最終的にはhasとmaybeを用意して、独自のoptions型にmacroで保証させる。ということをやってます。
https://github.com/Project-Starlivia/Strune/blob/main/crates/operation/src/dependents.rs#L4-L43
https://github.com/Project-Starlivia/Strune/blob/main/cli/src/main.rs#L13-L25
optionsをジェネリックにs...(略
正直このジェネリックはなんか間違っている気がします。おしえてえらいひと
# 描画
やっとssgっぽいことをします。今回は[tera](https://github.com/Keats/tera)というテンプレートエンジンを使用しました。


初期化して基礎プロパティを入れて、
https://github.com/Project-Starlivia/Strune/blob/main/crates/tera-render/src/ingwaz.rs#L69-L83

`[名前: リンク先]`の配列を作ってから、各ページを描画。
https://github.com/Project-Starlivia/Strune/blob/main/crates/tera-render/src/ingwaz.rs#L75-L93
https://github.com/Project-Starlivia/Strune/blob/main/crates/tera-render/src/ingwaz.rs#L24-L53
リンク先の解決は、もうちょっといい方法がある気はしています。

---
テンプレート側はこんな感じ。継承や埋め込みもできて良い感じ。

https://github.com/Project-Starlivia/Strune/blob/main/crates/tera-render/templates/ingwaz/base.html
node_page側のimportもbase側に書かないとエラーが出て、そこだけ悩ましい。ちょっと複雑な運用しすぎてるんかなぁ～うーん。
https://github.com/Project-Starlivia/Strune/blob/main/crates/tera-render/templates/components/header.html
こういうidを真面目に振るの、ssgっぽくてとても楽しい。(書いてから気づいたけどidじゃなくてclassのイメージもある。)
https://github.com/Project-Starlivia/Strune/blob/main/crates/tera-render/templates/ingwaz/node_page.html

# 実行、CI/CD
実行部分はこんな感じ。mdをロードして、dependents埋めて、distをクリア、レンダー、distにpublicをコピー。
https://github.com/Project-Starlivia/Strune/blob/main/cli/src/main.rs#L41-L75
デプロイはこう。これは完全にmade in ai
https://github.com/Project-Starlivia/Strune/blob/main/.github/workflows/deploy.yml
generate static siteは0sだけど、buildに結構時間かかっちゃってる～もうちょっと早くならんかな
![[Pasted-image_20251218112220.png]]
# 終わりに
ココまでお付き合いいただきありがとうございました。
テンプレートエンジンが強力で、案外ssg自体はシンプルに構築できるな～と思いました(拡張や最適化は絶対辛いけど)
Rustに関しては、docsも読まず、メモリとかほぼ意識せずに書いたため全く使いこなせている気はしませんが、ローダー部分以外では変なエラーで詰まる。みたいなことがなく片鱗は感じられた気がしています。

とりあえず前からあったRustを触りたい欲がほどほどに満たされて個人的には満足です(ポートフォリオをコレで作り直したいと考えてるので、もうちょっとやりますが)。次はmoonbitを触りたい。