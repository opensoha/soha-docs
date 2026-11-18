# 新增页面

1. 在 `web/src/features` 对应业务目录下新增或扩展页面组件模块。
2. 在 `web/src/routes/index.tsx` 中注册页面路由。
3. 若页面需要出现在侧边栏导航或面包屑中，同步在 `web/src/routes/meta.ts` 中新增或更新路由元数据。
4. 优先复用现有的控制台外壳、表格、弹窗与全局范围工具栏（Scope Toolbar）交互模式，避免过早引入新的共享抽象。
5. 统一通过 `web/src/services/api-client.ts` 与 TanStack Query 获取服务端聚合后的 DTO 数据。
