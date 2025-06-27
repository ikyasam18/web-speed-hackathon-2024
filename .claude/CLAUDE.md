# Web Speed Hackathon 2024 - 環境構築

## Node.js バージョン

このプロジェクトは Node.js v24 で問題が発生するため、Node.js v20 を使用してください。

### Node.js v20 の導入方法（macOS）

```bash
# Homebrew で Node.js 20 をインストール
brew install node@20

# パスを通す（現在のセッションのみ）
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

# パスを永続的に通す（.zshrc に追加）
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# バージョン確認
node -v  # v20.x.x と表示されることを確認
```

### pnpm インストールの問題

- Python 3.12 では `distutils` モジュールが標準ライブラリから削除されているため、node-gyp でエラーが発生することがある
- その場合は `pip install setuptools` を実行して setuptools（distutils を含む）をインストールする
- Node.js v24 では C++ の `concept` 機能の問題によるコンパイルエラーが発生するため、Node.js v20 を使用する