# Soha 公开文档仓库入口

- 本仓负责公开 Nextra 文档站和 API reference；内部规划归属工作区 `docs/`，未验证行为不能写成已交付能力。
- 在 OpenSoha 多仓工作区中读取 `../AGENTS.md` 一次；独立克隆时使用本仓规则，不要求初始化相邻仓库或规划工具。
- 公开文档或站点改动按需使用 [soha-docs](.agents/skills/soha-docs/SKILL.md)，保持导航、双语内容和真实 API 一致。
- 文案改动检查内容、链接与相关文档检查；站点组件、构建或发布改动按 [CI](.github/workflows/ci.yml) 验证，主入口为 `npm test && npm run build`，API 参考有 `npm run api:reference:check`。
- 相关代码和环境未变化时复用成功验证；保留用户未提交改动，不把站点构建结果作为产品功能验收。
