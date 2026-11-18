# 前端结构

## 当前技术栈

- 当前活跃的前端工程目录为 `web`，基于 `vite` 与 `react-router-dom` 运行
- 历史备份目录（如 `web_pro_backup` 与 `old_web`）仅在历史演进中作为功能行为参考，不参与当前构建
- 控制台外壳与页面基础组件基于原生 `antd`、`@ant-design/icons` 以及自定义 `soha` 布局与主题体系构建
- Tailwind CSS 4 作为布局与间距的辅助工具层保留
- `web/src/styles/globals.css` 定义 Vite 应用外壳下的全局共享页面样式
- 路由驱动页面使用 TanStack Query 管理服务端状态，使用 Zustand 管理界面偏好与当前资源范围（Scope）状态

```text
web/src/
  App.tsx
  main.tsx
  layouts/
    app-layout.tsx
  routes/
    index.tsx
    meta.ts
  features/
    access/
      access-pages.tsx
    auth/
      auth-api.ts
      login-page.tsx
      oidc-callback-page.tsx
    copilot/
      chat-page.tsx
    delivery/
      delivery-pages.tsx
    docs/
      docs-page.tsx
    observability/
      monitoring-pages.tsx
    platform/
      cluster-detail-page.tsx
      clusters-page.tsx
      extensions-pages.tsx
      network-storage-pages.tsx
      overview-page.tsx
      workloads-pages.tsx
    settings/
      settings-pages.tsx
    system/
      system-pages.tsx
  services/
    api-client.ts
  stores/
    auth-store.ts
    platform-scope-store.ts
    preferences-store.ts
  styles/
    globals.css
  components/
    admin-table.tsx
    page-header.tsx
    platform-scope-toolbar.tsx
    stat-grid.tsx
    status-tag.tsx
  types/
    index.ts
  utils/
    table-columns.ts
    time.ts
  theme/
    app-theme.ts
  vite-env.d.ts
```

## 前端开发规范

- `web/src/routes/index.tsx` 是 Vite 控制台的唯一活跃路由注册入口
- `web/src/layouts/app-layout.tsx` 承载共享的控制台外壳、侧边栏、顶栏、面包屑与主题联动外框
- 路由入口模块应保持轻量，具体业务编排与页面实现收敛到 `web/src/features/**`
- `web_pro_backup` 与 `old_web` 仅限只读对照，严禁当作当前活跃外壳或导入依赖使用
- 所有 HTTP 请求统一经由 `soha` 认证辅助封装访问同源 `/api/v1`
- 客户端持久化状态集中存放在 `web/src/stores`：其中 `preferences-store.ts` 负责持久化主题和侧边栏偏好，服务端业务数据状态统一保存在 TanStack Query 中
- `components/` 存放共享的 `antd` 封装原语与高复用度复合组件
- `utils/time.ts` 统一维护面向表格展示的日期与相对时间格式化工具
- `utils/table-columns.ts` 统一维护常用的表格列宽与对齐预设
- 工程默认不预置空置的 `hooks/` 目录，仅在出现明确跨模块复用诉求时按需创建
- 新增活跃页面时，必须同步更新 `web/src/routes/index.tsx` 与 `web/src/routes/meta.ts`
- 前端页面代码只消费服务端聚合后的 DTO，不在浏览器侧拼装底层原始资源对象
