---
title: 文档发布验收记录
description: 记录 soha-docs 外部发布开关、Next.js 托管配置和首次发布验收证据。
---

# 文档发布验收记录

本文记录 `soha-docs` 外部发布开关的验收状态。发布路径使用标准 Next.js/Nextra i18n 托管，不走 GitHub Pages；首次发布后必须把远端部署、域名和 smoke 证据补回本文。

## 当前目标

| 项目 | Release 目标值 | 验收状态 |
| --- | --- | --- |
| Published origin | `https://docs.opensoha.dev` | 已写入 `next.config.mjs` 默认值 |
| Base URL | `/` | 已写入 `next.config.mjs` 默认值 |
| i18n routing | `/zh`, `/zh/docs/...`, `/en`, `/en/docs/...` | 已切换到 `nextra/locales` 官方 i18n 代理 |
| Vercel project | project root `soha-docs`, build `npm run build` | 待仓库管理员在 Vercel 项目设置中确认 |
| GitHub integration | connected repository with automatic Next.js output detection | 待仓库管理员在 Vercel 项目设置中确认 |
| First publish run | Vercel production deployment | 待首次远端 production deployment 成功后记录 |

备用部署形态是 `https://opensoha.dev/site/`。只有 release 环境明确改为该形态时，才使用 `DOCS_SITE_URL=https://opensoha.dev` 和 `DOCS_BASE_URL=/site/` 覆盖默认值。

## 开关验收

- Vercel project root 必须是 `soha-docs`。
- Build command 必须是 `npm run build`。
- Output directory 必须留空或使用自动检测，不能配置为 `out`。
- 自定义域名必须与 release origin 一致：`docs.opensoha.dev`。
- 默认 build 必须使用 `DOCS_SITE_URL=https://docs.opensoha.dev` 和 `DOCS_BASE_URL=/`。
- 子路径部署只允许通过部署环境变量覆盖，不应修改默认 release 值。
- Locale cookie 使用 `NEXT_LOCALE`，未带 locale 的 `/` 和 `/docs/...` 必须按官方 i18n 代理跳转到 `/zh` 或 `/en`。

本地 release build 验证命令：

```bash
DOCS_SITE_URL=https://docs.opensoha.dev DOCS_BASE_URL=/ npm run build
```

子路径兼容验证命令：

```bash
DOCS_SITE_URL=https://opensoha.dev DOCS_BASE_URL=/site/ npm run build
```

## 首次 publish 记录

首次发布必须通过 Vercel production deployment 或等价 Next.js host 发布，并记录以下证据：

| 字段 | 记录 |
| --- | --- |
| Run URL | 待补充 |
| Commit SHA | 待补充 |
| `DOCS_SITE_URL` | `https://docs.opensoha.dev` |
| `DOCS_BASE_URL` | `/` |
| Deployment URL | 待补充 |
| Vercel project screenshot or audit note | 待补充 |
| GitHub integration screenshot or audit note | 待补充 |
| DNS/custom domain screenshot or audit note | 待补充 |
| Result | Pending external Vercel publish |

发布后 smoke 必须至少覆盖：

```bash
curl -I -s https://docs.opensoha.dev/zh/
curl -I -s https://docs.opensoha.dev/zh/docs/api/contracts/
curl -I -s https://docs.opensoha.dev/en/docs/
```

验收完成条件：

- Vercel production deployment 成功。
- Production deployment URL 指向 `https://docs.opensoha.dev/`。
- 上述三个 URL 返回 `200` 或等价成功状态。
- 本文的 Run URL、Commit SHA、Deployment URL、Vercel project、GitHub integration 和 DNS/custom domain 记录已补齐。
