// open-siv-3d-ui.cpp
// Aggregated sample code snippets for article "【OpenSiv3D】真面目にSiv3Dで凝ったUIを作ってみる"
// Note: This file may not compile; it's for embedding code on Zenn.

// ===== Section 1: StageUI::update / updateLeftSide / updateRightSide =====
void StageUI::update(double deltaTime, double gameTimeScale, Vec2 scroll, double resources, bool& canvasOpen,  
                     std::function<void(std::type_index)> onChangeScene) const{  
    // ゲームオーバー・ゲームクリアと通常プレイの画面用のスクロール値計算  
    const auto ratio = m_context->State() == GameCore::Playing ? 0 : 1;    // 現在, 目標値, 経過時間*8(通常、1秒の8分の1)でLerp  
    m_gameScroll = Math::Lerp(m_gameScroll, ratio, deltaTime * 8);  
    // 上記のスクロール値に応じて基準点の作成  
    Transformer2D t{Mat3x2::Translate(0, m_gameScroll * Scene::Height()), TransformCursor::Yes};    // 通常プレイ画面を描画。左右で分けてある  
    updateLeftSide(deltaTime, gameTimeScale, resources, canvasOpen);    updateRightSide(scroll);  
    // 画面1つ分上に基準点  
    Transformer2D gt{Mat3x2::Translate(0, -Scene::Height()), TransformCursor::Yes};    // ゲームオーバー・ゲームクリア画面の描画  
    const auto backButton = drawGame();  
    // タイトルに戻るボタンが押されていたらシーン遷移  
    if (backButton.leftClicked())    {       onChangeScene(typeid(GameCore::TitleScene));    }}  
  
void StageUI::updateLeftSide(double deltaTime, double gameTimeScale, double resources, bool& canvasOpen) const  
{  
    // 左側全体の原点  
    Transformer2D t(Mat3x2::Translate(80, 100), TransformCursor::Yes);    // 影を先に描画  
    drawKirimiPaletteShadow();    // 状態の更新。この中にdrawも入ってる。  
    updateKimeraCanvas(deltaTime, gameTimeScale, canvasOpen);    updateKirimiPalette(resources);    // ボタン毎に実行  
    for (const auto&& [i, button] : Indexed(m_kirimiButtons))    {        // 押された時  
       if (button.rect().leftClicked())       {           // 選択されているものの保存  
          if (m_context->getKirimiInventory()[i].second.GetSpawnCost() >= 0)          {             m_selectedKirimiIdx = static_cast<int>(i);          }       }       // 描画  
       button.draw(m_context->getKirimiInventory()[i].first, i == m_selectedKirimiIdx, resources);    }}  
  
void StageUI::updateRightSide(Vec2 scroll) const  
{  
    // 右の原点  
    Transformer2D t(Mat3x2::Translate(Scene::Width() - 480, 30), TransformCursor::Yes);    // 描画  
    updateChart();    updateMinimap(scroll);}  
  
// ===== Section 1b: UI Colors =====
// UI Colors    const ColorF m_baseColor { Palette::Dimgray };    const ColorF m_mainColor { Palette::Slategray };    const ColorF m_accentColor { Palette::Lightsteelblue };    const ColorF m_subColor { Palette::Black };    const ColorF m_shadowColor { Palette::Black, 0.3 };    const ColorF m_canvasColor{ Palette::White, 0.3 };    const ColorF m_canvasFadeOutColor{ Palette::Slategray, 0.2 };    const ColorF m_canvasFadeInColor{ Palette::Slategray, 0 };

// ===== Section 2: KirimiButton::draw =====
void KirimiButton::draw(GameCore::SpriteAnimation animation, bool selected, double resource) const  
{  
    // コストがマイナスだった場合、非アクティブな表示  
    if (m_param.GetSpawnCost() < 0)    {       const RoundRect rr{ m_rect, 20 };       rr.draw(m_disableColor);       rr.drawFrame(0, 10, m_borderColor);  
       const Vec2 center = rr.center();       const Vec2 size{ rr.w - 20, rr.h - 20 };       animation.Draw(center - size / 2, size);  
       return;    }  
    // 背景色を選定  
    ColorF fill = m_normalColor;                 // 通常  
    if (selected) fill = m_activeColor;          // 選択時  
    else if (m_mouseOver) fill = m_disableColor; // ホバー時  
  
    // 角丸20で塗りつぶし  
    const RoundRect rr{ m_rect, 20 };    rr.draw(fill);  
    // 次にそのキリミが表示できるようになるまでの割合  
    const double nextCostRatio = std::fmod(resource, m_param.GetSpawnCost()) / m_param.GetSpawnCost();    const double h = rr.h * nextCostRatio;    const RectF bottomRect{ rr.x, rr.y + (rr.h - h), rr.w, h };    // 角丸にクリップ、描画  
    const auto clipped = Geometry2D::And(rr.asPolygon(), bottomRect.asPolygon());    for (const auto& poly : clipped) {       poly.draw(ColorF{ 1, 0.2 });    }  
    // 枠線  
    rr.drawFrame(0, 10, m_borderColor);  
    // 中央を把握  
    const Vec2 center = rr.center();    const Vec2 size{ rr.w - 20, rr.h - 20 };    // アイコンの描画(今回gif画像を使っているのでちょっと表示方法が特殊。)  
    animation.Draw(center - size / 2, size);  
    // 使用コスト  
    m_fontValue(Format(m_param.GetSpawnCost()))       .draw(48, Arg::bottomCenter = Vec2{ rr.x + rr.w / 2, rr.y + rr.h }, m_borderColor);  
    // 配置可能数  
    const int instanceCounts = static_cast<int>(resource / m_param.GetSpawnCost());    m_fontValue(U"x" + Format(instanceCounts))       .draw(32, Arg::topRight = Vec2{ rr.x + rr.w - 10, rr.y + 3 }, m_borderColor);  
  
    // マウスホバー  
    if (m_mouseOver)    {       rr.drawShadow(Vec2{ 0, 2 }, 8, 1.0, ColorF{ 0, 0, 0, 0.15 });    }}  

// ===== Section 3: StageUI::updateKirimiPalette =====
void StageUI::updateKirimiPalette(double resources) const  
{  
    drawKirimiPalette(resources);}  

// ===== Section 4: StageUI::drawKirimiPaletteShadow / drawKirimiPalette =====
void StageUI::drawKirimiPaletteShadow() const  
{  
    // 影。全体で影オフセットを統一してある。  
    RoundRect{0, 0, 350, 900, 50}.moveBy(m_shadowOffset).draw(m_shadowColor);}  
  
void StageUI::drawKirimiPalette(double resources) const  
{  
    // 全体  
    RoundRect{0, 0, 350, 900, 50}.draw(m_baseColor).drawFrame(0, 15, m_subColor);    // 現在コストの座布団  
    RoundRect{30, 800, 290, 75, 20}.draw(m_baseColor).drawFrame(0, 10, m_subColor);  
    // 現在コスト(多分書き方ミスってる)  
    const auto resText = Format(U"{:0>9}", static_cast<int>(resources));    m_resourceLabel(resText).drawAt(Vec2{174, 835}, m_subColor);}  

// ===== Section 5: StageUI::updateKimeraCanvas =====
void StageUI::updateKimeraCanvas(double deltaTime, double gameTimeScale, bool& canvasOpen) const  
{  
    // ゲームのタイムスケールにキャンバスの幅は依存する。タイムスケールが0のとき1000、1のとき0。  
    m_canvasWidth = (1.0 - gameTimeScale) * 1000;    const auto width = static_cast<int>(m_canvasWidth);    const auto height = 850;  
    // キャンバスのオフセット  
    Transformer2D t(Mat3x2::Translate({300, 25}), TransformCursor::Yes);    // 描画を投げる。以下は取手のところまで判定を行う。  
    const auto rects = drawKimeraCanvas({width, height});  
    // 生成ボタン  
    auto anyInput = false;    if (rects.spawnButton.leftClicked())    {       // 生成処理。主題ではないためここではスキップ。  
       // キャンバスを閉じる  
       canvasOpen = false;       // 入力があったことを伝える  
       anyInput = true;    }    // 拡大ボタン  
    if (rects.propButtons[0].leftPressed())    {       m_kirimiSize += deltaTime * 100;       // 入力があったことを伝える  
       anyInput = true;    }    // 縮小ボタン...  
    // 左回転...  
    // 右回転...  
  
    // キャンバス場をクリックした時の処理。  
    if (!anyInput && rects.canvasRect.leftClicked())    {       // ...    }  
    // 取っ手のオフセット  
    Transformer2D tHandle(Mat3x2::Translate({width + 33, 0}), TransformCursor::Yes);    // キャンバスの取っての描画  
    drawCanvasHandle(canvasOpen, 800);    // キャンバスの開閉の変更  
    if (MouseR.down() || m_kimeraHandleUnion.leftClicked())    {       canvasOpen = !canvasOpen;    }}  

// ===== Section 6: StageUI::drawKimeraCanvas =====
StageUI::CanvasRects StageUI::drawKimeraCanvas(Size size) const  
{  
    // 結果用の配列  
    auto result = StageUI::CanvasRects{};    // キャンバス自体のサイズの調整  
    size.x += 50;    Rect rr{size};    result.canvasRect = rr;    // ベースの描画  
    rr.draw(m_canvasColor);    const int fadeLength = 20;    // フェードを描画  
    Rect{0, 0, size.x, fadeLength}.draw(Arg::top(m_canvasFadeOutColor), Arg::bottom(m_canvasFadeInColor));    Rect{0, size.y - fadeLength, size.x, fadeLength}.draw(Arg::top(m_canvasFadeInColor),                                                          Arg::bottom(m_canvasFadeOutColor));  
    // 原点のリセット  
    auto M = Graphics2D::GetLocalTransform();    const Vec2 absOffset{M._31, M._32};  
    rr.setPos((int32)absOffset.x, (int32)absOffset.y);  
    Transformer2D _reset{Mat3x2::Identity(), Transformer2D::Target::SetLocal};  
    // ScopedViewport2Dの定義  
    const ScopedViewport2D viewport{rr};  
    // 配置されたキリミのパーツの描画(命名悪い)  
    drawDeepFish();    // カーソル追従のキリミの描画  
    drawKirimiGhost();  
    // 各種詳細ボタン用の値の構築  
    const auto propShadowOffset = m_shadowOffset / 8;    const auto xList = {130, 220, 310, 400};  
    // x座標ごとに  
    for (auto& x : xList)    {       // 詳細ボタン座布団の描画  
       const auto r = Circle{{x, 65}, 36}.draw(m_shadowColor).movedBy(-propShadowOffset).draw(m_mainColor);       // 作成したボタン情報の格納  
       result.propButtons << r;    }    // 召喚ボタンの座布団描画  
    result.spawnButton = RoundRect{{650, 700}, {350, 125}, 20}.draw(m_shadowColor).movedBy(-propShadowOffset * 2).                                                               draw(m_accentColor).drawFrame(15, 0, m_subColor);  
    // 詳細ボタンのアイコン描画  
    const std::array<std::u32string, 4> iconList = {U"\U000F0415", U"\U000F0374", U"\U000F0467", U"\U000F0465"};    for (auto&& [i, x] : Indexed(xList))    {       const auto pos = Vec2{x, 65} - propShadowOffset;       m_propLabel(iconList[i]).drawAt(pos);    }  
    // 各種インフォテキスト(未実装)  
    m_infoLabel(U"キリミコスト x0123.45").draw(680, 25);    m_infoLabel(U"キメラコスト 012345").draw(680, 75);    m_alertLabel(U"コスト超過").drawAt(size / 2, ColorF {Palette::Red, 0.75f });  
  
    // 召喚ボタンのテキスト  
    const auto textPos = Vec2{820, 755} - propShadowOffset;    m_spawnLabel(U"ショウカン").drawAt(textPos);  
  
    return result;}  

// ===== Section 7: StageUI::precomputeGeometry / drawCanvasHandle =====
void StageUI::precomputeGeometry()  
{  
    // ...    const int height = 850;    RoundRect handleBase{0, 0, 65, height, 15};    RoundRect handleTip{50, 50, 50, height - 100, 15};    const auto u = Geometry2D::Or(handleBase.asPolygon(), handleTip.asPolygon());    m_kimeraHandleUnion = u.isEmpty() ? Polygon{} : u[0];}  
  
void StageUI::drawCanvasHandle(const bool canvasOpen, const int height) const  
{  
    // 座布団  
    m_kimeraHandleUnion.movedBy(m_shadowOffset).draw(m_shadowColor);    m_kimeraHandleUnion.draw(m_baseColor);    m_kimeraHandleUnion.drawFrame(15, m_subColor);  
    // 矢印のための原点指定  
    Transformer2D tArrow(Mat3x2::Translate({60, height / 2}), TransformCursor::Yes);  
    // 上下の飾り  
    Line{0, 120, 0, 300}.draw(LineStyle::RoundCap, 10, m_shadowColor);    Line{0, -120, 0, -300}.draw(LineStyle::RoundCap, 10, m_shadowColor);  
    // 矢印の非アクティブなの描画  
    Line{-15, 60, 15, 0}.draw(LineStyle::RoundCap, 10, m_mainColor);    Line{-15, -60, 15, 0}.draw(LineStyle::RoundCap, 10, m_mainColor);    Line{-15, 0, 15, 60}.draw(LineStyle::RoundCap, 10, m_mainColor);    Line{-15, 0, 15, -60}.draw(LineStyle::RoundCap, 10, m_mainColor);  
    // キャンバスの開状態に合わせてアクティブな矢印を上から描画  
    if (canvasOpen)    {       Line{-15, 0, 15, 60}.draw(LineStyle::RoundCap, 10, m_accentColor);       Line{-15, 0, 15, -60}.draw(LineStyle::RoundCap, 10, m_accentColor);    }    else    {       Line{-15, 60, 15, 0}.draw(LineStyle::RoundCap, 10, m_accentColor);       Line{-15, -60, 15, 0}.draw(LineStyle::RoundCap, 10, m_accentColor);    }}  

// ===== Section 8: StageUI::updateChart / drawChart =====
void StageUI::updateChart() const  
{  
    const int size = 200;    Transformer2D t(Mat3x2::Translate({size, size}), TransformCursor::Yes);  
    drawChart(size);}  
  
void StageUI::drawChart(int size) const  
{  
    // 外周のサイズ  
    const int outFrameSize = 15;    // 中身のサイズ  
    const int inFrameSize = 40;  
    Circle frameRect{size};    Circle contentRect{size - inFrameSize};  
    // 影の描画  
    frameRect.movedBy(m_shadowOffset).draw(m_shadowColor);    // 外周、ベースの描画  
    frameRect.draw(m_baseColor);    frameRect.drawFrame(0, outFrameSize, m_subColor); // 枠線  
    // 中身の描画  
    contentRect.draw(m_mainColor);  
    // 等高線みたいなやつ  
    Circle{10}.draw(m_shadowColor);    Circle{40}.drawFrame(3, m_shadowColor);    Circle{80}.drawFrame(3, m_shadowColor);    Circle{120}.drawFrame(3, m_shadowColor);  
    // 十字線  
    Line{{-160, 0}, {160, 0}}.draw(3, m_shadowColor);    Line{{0, -160}, {0, 160}}.draw(3, m_shadowColor);  
    // 中身の内側に向けてフェード・影  
    contentRect.drawFrame(30, 0, ColorF{0, 0.0}, m_shadowColor);  
    // レーダーチャート用の計算・描画  
    const Array<double> ratios = { 1.0, 0.8, 0.9, 0.1, 0.0, 0.05 };    const Array<String> labels = { U"Hp", U"Atk", U"AtkRt", U"Dif", U"Spd", U"Wgt" };    Array<Vec2> points;    for (size_t i = 0; i < ratios.size(); ++i)    {       const double angle = Math::ToRadians(-90.0 + 360 / labels.size() * i);       const Vec2 direction{ Math::Cos(angle), Math::Sin(angle) };       points << (direction * ratios[i] * 120);       m_infoLabel(labels[i]).drawAt(direction * 150, ColorF{ m_accentColor, 0.5});       Circle{ points[i], 8 }.draw(m_accentColor);    }  
    const Polygon polygon{ points };    polygon.draw(ColorF{ m_accentColor, 0.5 });    polygon.drawFrame(4, m_accentColor);}  

// ===== Section 9: StageUI::updateMinimap / drawMinimap =====
void StageUI::updateMinimap(Vec2 scroll) const  
{  
    Transformer2D baseT(Mat3x2::Translate({100, 430}), TransformCursor::Yes);    drawMinimap(scroll);}  
  
void StageUI::drawMinimap(Vec2 scroll) const  
{  
    // 各種プロパティの定義...  
  
    // ベースの図形  
    const RoundRect mainRect{frameSize, frameSize, mainSize, mainCornerR};    // 枠線の図形  
    const RoundRect frameRect{       outFrameSize, outFrameSize, mainSize.x + inFrameSize * 2, mainSize.y + inFrameSize * 2, frameRounded    };  
    // 枠線  
    frameRect.drawFrame(0, outFrameSize, m_subColor);    // 中をくり抜いてベースの枠を描画  
    m_minimapFrameCutout.draw(m_baseColor);    // メインの半透明部分  
    mainRect.draw(m_canvasColor);  
    // 影の描画  
    m_minimapShadowCutout.draw(m_shadowColor);  
    // 原点を中央に  
    Transformer2D mainT(Mat3x2::Translate({frameSize + mainSize.x / 2, frameSize + mainSize.y / 2}),                        TransformCursor::Yes);    // 味方・敵拠点の線  
    const int scrollYSize = 120;    const auto greenLineY = mainSize.y / 2 - 20;    const auto redLineY = -mainSize.y / 2 + scrollYSize - 5;    const auto lineX = mainSize.x / 2 - 8;    Line{{-lineX, greenLineY}, {lineX, greenLineY}}.draw(5, Palette::Green);    Line{{-lineX, redLineY}, {lineX, redLineY}}.draw(5, Palette::Red);    // 敵拠点のイメージ画像  
    m_minimapBuildingClip.drawFrame(5, Palette::Red);    Circle{8, redLineY - 70, 5}.drawFrame(5, Palette::Red);    Circle{15, redLineY - 90, 7}.drawFrame(5, Palette::Red);  
    // 味方拠点のイメージ画像  
    m_minimapMarineClip.drawFrame(5, Palette::Green);  
    // 半透明ないのフェード  
    Circle fadeCornerRect{mainCornerR};    const Point mainCenter{mainSize.x / 2 - mainCornerR, mainSize.y / 2 - mainCornerR};    // ...  
    Rect{-mainCenter.x, -mainCenter.y - mainCornerR, mainSize.x - mainCornerR * 2, mainCornerR}.draw(       Arg::top(m_canvasFadeOutColor), Arg::bottom(m_canvasFadeInColor));    // ...  
    // スクロールの現在地に基づいて計算、描画  
    const auto base = Scene::Height() * 0.05;    const double ratio = (-scroll.y + base) / (base + m_context->getSceneHeight());  
    const int margin = 15;    Point decoSize{mainSize.x - margin, 120};    Transformer2D scrollT(Mat3x2::Translate({0, (mainSize.y - decoSize.y - margin) * (ratio - 0.5)}),                          TransformCursor::Yes);    RoundRect{-decoSize / 2, decoSize, mainCornerR - 4}.drawFrame(5, m_accentColor);    Line{{-10, 0}, {10, 0}}.draw(5, m_accentColor);    Line{{0, -10}, {0, 10}}.draw(5, m_accentColor);}  
