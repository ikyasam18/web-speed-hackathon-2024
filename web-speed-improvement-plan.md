# Web Speed Hackathon 2024 改善計画

## 現状の問題点

コードベースとサイトの動作を分析した結果、以下のパフォーマンス上の問題点が特定されました。

### 1. フォントの最適化問題

- すべてのNoto Sans JPのウェイト（9種類）を一度にプリロードしている
- すべてのフォントが.woff形式のみで提供されている（.woff2の方が圧縮率が高い）
- 実際に使用するフォントのみをロードする最適化がされていない

### 2. 画像の最適化問題

- 多数の画像がJPEG形式で配信されている
- 画像のサイズが適切に最適化されていない可能性がある
- 遅延ロードが実装されていない可能性がある
- `webpConverter.ts`では、WebP形式の変換効率が低い設定になっている（effort: 6）
- 画像処理の重大な問題：`useImage`フックで非効率な画像処理を行っている
  - 各画像をJavaScriptで再処理（デコード、キャンバスに描画、DataURLに変換）
  - クライアント側で無駄なオブジェクトフィット処理をしている

### 3. JavaScript最適化の問題

- バンドルが最適化されていない
- tree-shakingが無効になっている（tsup.config.tsの`treeshake: false`）
- コード分割が行われていない（`splitting: false`）
- ポリフィルが不要な場合でも常にインクルードされている
- `preloadImages.ts`で全ての画像を先読みしている（大量のリクエストが発生）

### 4. サーバーサイドの最適化問題

- 圧縮ミドルウェアが`zstd`のみをサポートしており、一般的な`gzip`や`brotli`をサポートしていない
- キャッシュ戦略が最適化されていない可能性がある
- データベースクエリの最適化不足：`featureRepository.readAll`で過剰なデータを取得している

### 5. Service Workerの最適化問題

- Service Workerがリソースのキャッシュに効果的に使用されていない
- 画像キャッシュやオフラインサポートの実装が不十分

### 6. 非効率なレンダリングプロセス

- Suspenseの使用が非効率（各カード単位でSuspenseを使用している）
- 画像の読み込みが複雑で重複処理が多い
- 画像のデコード処理が各画像ごとに行われており、パフォーマンスに大きな影響がある

## 改善計画

以下の改善を実施することで、Lighthouseスコアを向上させることができます：

### 1. フォント最適化

- 使用するフォントウェイトを必要最低限に減らす（Regular, Bold, Medium程度）
- フォント形式を.woff2に変更し、さらに圧縮サイズを削減
- font-displayプロパティを追加してフォントのレンダリング戦略を最適化
- フォントのサブセット化を検討（日本語で頻繁に使用される文字のみを含む）

### 2. 画像最適化

- すべての画像をWebP形式に変換し、さらに最適な設定で圧縮
  - `webpConverter.ts`の`effort`パラメータを上げる（例：6→9）
- 画像の遅延ロード実装（Intersection Observerの利用）
- srcsetとsizeを使用した適切なサイズの画像提供
- 画像の事前読み込み戦略の最適化（重要な画像のみpreload）
- **重要な改善点**：`useImage`フックを完全に書き直す
  - クライアント側での画像再処理を削除し、直接URLを使用
  - サーバー側で適切なサイズと形式の画像を提供
  - `img`タグに`loading="lazy"`属性を追加
  - オブジェクトフィット処理はCSSで行う

### 3. JavaScript最適化

- tree-shakingを有効化（`treeshake: true`）
- コード分割を有効化（`splitting: true`）
- 不要なポリフィルの削除
- クリティカルパスJSの最小化と非同期ロード
- 不要なライブラリの削除または軽量の代替品に置き換え
- `preloadImages.ts`の最適化：
  - 画面に表示されるコンテンツのみを先読みする
  - ファーストビューの重要な画像以外は遅延ロードに切り替え

### 4. サーバーサイド最適化

- `gzip`と`brotli`圧縮のサポート追加
- 適切なキャッシュヘッダーの設定
- 静的アセットに長期キャッシュを設定
- データベースクエリの最適化：
  - 必要なデータのみを取得するよう`featureRepository.readAll`などを修正
  - N+1クエリ問題の解決

### 5. Service Worker最適化

- 画像やスタイルシートなどの静的リソースをキャッシュするように改善
- ネットワークファーストからキャッシュファーストへの戦略変更
- オフラインサポートの改善

### 6. レンダリングプロセスの最適化

- Suspenseの使用を最適化（ページ単位での使用に変更）
- コンポーネントの分割と効率的なレンダリング
- 画像読み込みの並列化と優先順位付け
- 以下のコンポーネントを最適化：
  - `FeatureCard`：画像処理の簡素化
  - `Image`コンポーネント：遅延ロードのデフォルト化
  - `useImage`フック：完全に書き直す

## 期待される結果

これらの最適化を実施することで、以下の改善が期待されます：

- 初期読み込み時間の大幅な短縮
- First Contentful Paint (FCP)の改善
- Largest Contentful Paint (LCP)の改善
- Cumulative Layout Shift (CLS)の削減
- Time to Interactive (TTI)の改善
- Lighthouseパフォーマンススコアの向上

## 実装優先順位と具体的な手順

### 第1フェーズ：画像処理の最適化（最も効果が高い）

1. **`useImage`フックの書き直し**
   ```typescript
   // 既存のコード
   export const useImage = ({ height, imageId, width }: { height: number; imageId: string; width: number }) => {
     const { value } = useAsync(async () => {
       // 非効率な画像処理...
       // キャンバスでの再描画...
       return canvas.toDataURL('image/png');
     }, [height, imageId, width]);
     
     return value;
   };
   
   // 改善後のコード
   export const useImage = ({ height, imageId, width }: { height: number; imageId: string; width: number }) => {
     return getImageUrl({
       format: 'webp', // より効率的なWebP形式を使用
       height,
       imageId,
       width
     });
   };
   ```

2. **`Image`コンポーネントの最適化**
   ```tsx
   // 改善後のコード
   export const Image: React.FC<Props> = ({ height, loading = 'lazy', objectFit, width, ...rest }) => {
     return <_Image {...rest} $height={height} $objectFit={objectFit} $width={width} loading={loading} />;
   };
   ```

3. **画像変換処理の改善**：`webpConverter.ts`のeffortとqualityパラメータの最適化

### 第2フェーズ：基本的なパフォーマンス改善

1. **フォント最適化**：必要最低限のフォントのみをwoff2形式でロード
2. **JavaScriptバンドルの最適化**：tree-shakingとコード分割の有効化
3. **Service Workerの強化**：キャッシュ戦略の改善

### 第3フェーズ：高度な最適化

1. **データベースクエリの最適化**：`featureRepository.readAll`の改善
   ```typescript
   // リクエストされた必要なデータのみを取得するよう修正
   const data = await getDatabase().query.feature.findMany({
     columns: {
       id: true,
     },
     with: {
       book: {
         columns: {
           // 必要な情報のみに絞る
           id: true,
           name: true,
           // 不要な場合はdescriptionを取得しない
         },
         // 必要なリレーションのみに絞る
       },
     },
   });
   ```

2. **`preloadImages.ts`の最適化**：すべての画像ではなく、初期ビューの重要な画像のみを先読み
3. **レンダリングプロセスの最適化**：Suspenseの使用を見直し、コンポーネントの効率的な分割

## 最も効果的な改善点

1. **`useImage`フックの改善**：現在の実装ではJavaScriptによる画像の再処理とキャンバス操作が非常に非効率です。これを直接URLを使用する方式に変更するだけで、大幅なパフォーマンス向上が期待できます。

2. **画像形式の最適化**：すべての画像をWebP形式で提供し、適切に圧縮することで、ファイルサイズを大幅に削減できます。

3. **レンダリングの最適化**：現在はコンポーネントごとにSuspenseを使用していますが、これをより大きな単位（ページレベル）で行うことで、レンダリングのパフォーマンスが向上します。

4. **データベースクエリの最適化**：現在、不必要なデータまで取得しているクエリを最適化することで、サーバー側の負荷とレスポンス時間を削減できます。

## 総括

Web Speed Hackathon 2024のサイトには、特に画像処理とデータ取得において大きなパフォーマンス問題があります。最も重要な改善は、クライアント側での過剰な画像処理を削除し、より効率的な形式と適切なサイズの画像を直接提供することです。これらの最適化を実施することで、Lighthouseスコアが大幅に向上し、ユーザーエクスペリエンスが向上することが期待されます。