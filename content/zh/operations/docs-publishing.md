# 文档发布

公开文档站位于独立的 `soha-docs` 仓库，基于 Next.js 与 Nextra 构建。正式文档独立于 `soha` 核心二进制与 Web 产物进行发布。

当前站点采用 Nextra 官方文档主题的国际化（i18n）方案。中文内容位于 `content/zh`，英文内容位于 `content/en`，公开路由均带有语言前缀：

- `/zh` 与 `/zh/docs/...`
- `/en` 与 `/en/docs/...`

`proxy.ts` 从 `nextra/locales` 导出 `proxy`，使 `/` 与 `/docs/...` 根据 `NEXT_LOCALE` 或浏览器语言自动重定向至最匹配的语言路由。

## 常用命令

```bash
cd soha-docs
npm install
npm test
npm run typecheck
npm run build
npm run serve
```

文档应随代码变更同步演进；架构说明、API 文档与开发指南均属于项目的一等资产。

站点采用标准的 Next.js 构建流程，不会静态导出到 `out/`，也不通过 GitHub Pages 部署。请使用支持 Node 运行时的 Next.js 托管平台（如 Vercel）发布构建产物：将仓库根目录设为 `soha-docs`，构建命令设为 `npm run build`，并使用托管平台的 Next.js 自动输出检测。

`soha` 核心仓库不得引入本仓库源码树。默认情况下，`soha` 提供 API 与内嵌 Web 控制台，并将 `/docs/` 重定向至已配置的外部文档站地址。本地开发和私有化部署仍可按需使用文档资源的 `proxy` 或 `dir` 模式，但正式版文档始终作为独立站点维护与发布。

## 构建期环境变量

`next.config.mjs` 在构建期读取以下环境变量：

- `DOCS_SITE_URL`：已发布站点的源地址，默认值为 `https://docs.opensoha.com`
- `DOCS_BASE_URL`：已发布站点的路径前缀，默认值为 `/`
- `DOCS_SHOW_LAST_UPDATE_TIME`：为兼容发布工作流保留的变量，当前 Nextra 暂不渲染该字段

发布至 `https://docs.opensoha.com/` 时执行：

```bash
DOCS_SITE_URL=https://docs.opensoha.com DOCS_BASE_URL=/ npm run build
```

发布至 `https://docs.opensoha.com/site/` 时执行：

```bash
DOCS_SITE_URL=https://docs.opensoha.com DOCS_BASE_URL=/site/ npm run build
```

## 质量门禁

搜索质量门禁（Search quality gate）基于 Nextra 的本地 Pagefind 搜索。`next.config.mjs` 启用搜索并将代码块排除在索引之外。`npm run build` 在 Next.js 渲染页面后调用 Pagefind，将索引生成到 `public/_pagefind/`。本地和 Vercel 使用相同的构建命令。`scripts/verify-docs-drift.mjs` 检查发布说明与配置是否一致。

死链检查门禁分为两层：Nextra/Next 构建阶段会校验所有可路由页面，同时 `scripts/verify-docs-drift.mjs` 会在 `npm test` 期间扫描相对路径 Markdown 链接。

截图回归门禁（Screenshot regression gate）由 `quality/docs-screenshot-regression.json` 驱动。该清单记录了必需覆盖的 `desktop` 与 `mobile` 视口、各路由对应的源文档，以及针对构建后 HTML 执行的 DOM 与内容断言。当前检查脚本不会实际截取浏览器画面，也不会执行特定视口下的浏览器交互。在本地或 CI 完成构建后，运行 `npm run screenshots:check` 即可将渲染后的 Nextra 路由与 `quality/screenshots/baseline` 下检入的基线记录进行比对。若经评审的文档或 Web 路由变更修改了路由元数据、断言集合或允许的最小内容长度，请先核实变更内容，再更新基线：

```bash
npm run build
npm run screenshots:update
npm run screenshots:check
```

基线记录保存了路由、视口、源文件路径、断言集合以及渲染后 HTML 的最小长度下限。正文自然增长无需更新基线；但内容低于最小长度下限、元数据变化或缺失必要断言时均会触发失败。这些文本记录不包含源码或 HTML 哈希，也不能替代视觉或交互验收；涉及视觉变化时请另行检查实际页面渲染效果。

## 托管与发布流程

正式文档采用托管平台的 Next.js 部署流程，不使用 GitHub Pages：

- 将 `soha-docs` GitHub 仓库连接到目标 Next.js 托管平台（如 Vercel）。
- 使用 `soha-docs` 仓库根目录（Vercel 中为 `.`）。
- 将构建命令设为 `npm run build`。
- 输出目录保持留空或自动模式，由托管平台自动识别 Next.js 产物。
- 在 Vercel 项目中添加生产域名 `docs.opensoha.com`，并在 Cloudflare 用「仅 DNS」模式添加 Vercel 提供的 CNAME 记录。
- 不要添加 `public/CNAME` 或 `.github/workflows/publish.yml`，二者均为 GitHub Pages 专用产物。
- CI 工作流会在 `soha-docs` 同级检出固定版本的 `opensoha/soha` 主仓，并从 `../soha/contracts` 读取契约输入。
- 部署前验证命令依次为：`npm ci`、`npm run typecheck`、`npm test` 和 `npm run build`。

当发布地址不同于默认值时，需在托管环境中配置以下部署环境变量：

- `DOCS_SITE_URL`
- `DOCS_BASE_URL`
- `DOCS_SHOW_LAST_UPDATE_TIME`

CI 工作流会在每次构建前复用同一固定版本的主仓检出，并针对其 `contracts/` 模块执行文档一致性检查。

## 多语言内容维护策略

当前 Nextra 站点使用按语言划分的内容根目录：中文源目录为 `content/zh`，英文源目录为 `content/en`。自完成 Nextra 文档主题重构后，旧版 Docusaurus 翻译目录已不再属于活跃源码树。

调整双语内容时，请在 Next/Nextra 配置与 CI 工作流中同步保持搜索索引、规范 URL 及部署环境变量的显式一致性。
