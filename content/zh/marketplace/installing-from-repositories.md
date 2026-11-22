# 从 GitHub 仓库安装

仓库直装允许具备相应权限的运维人员预览公开 GitHub 仓库中的声明式插件，无需等待市场收录。仓库直装不会因此成为受信任来源或官方收录。

以下步骤适用于 [Soha Core 与内嵌 Web v0.1.15](https://github.com/opensoha/soha/releases/tag/v0.1.15) 和 [Soha CLI v0.2.2](https://github.com/opensoha/soha/releases/tag/cli/v0.2.2)。

## 支持的仓库引用

输入公开仓库 URL（如 `https://github.com/owner/repository`）可选择最新稳定的 GitHub Release。如果仓库还没有稳定 Release，请明确选择分支。用 `/releases/tag/<tag>` 选择已发布版本，或用 `/tree/<ref>` 和 CLI 的 `--ref` 指定分支、标签或提交。Soha 将预览固定到完整的 40 位 Commit SHA。

Soha 只读取仓库根目录的 `plugin.manifest.json`。私有仓库、任意 Git 托管平台、子目录 manifest、`/blob/` 文件链接、pull request 链接和 issue 链接均不支持。manifest 必须声明 `runtime.mode: manifest-only`；此流程不会克隆仓库、获取其他文件或执行仓库脚本。

## 使用 Web 安装

1. 在 **设置 → 扩展** 中打开插件市场，选择 **从仓库安装**。
2. 输入公开 GitHub 仓库 URL，可选填分支、标签或提交，然后开始预览。
3. 检查插件身份、兼容性、请求权限、仓库地址、固定提交、原始 manifest 摘要及来源/完整性状态。仓库直装不等于官方收录；摘要匹配不等于签名验签或安全审查。
4. 确认安装。新仓库直装插件默认处于停用状态。审阅声明并配置所需密钥后，再单独启用。

预览凭证短时有效，并绑定操作者、来源、固定提交和原始 manifest 字节。凭证过期或内容不匹配时，请重新预览。若实例中已有同 ID 但来源不同的插件，系统不会静默替换；请先检查已安装插件并明确处理来源冲突。

## 使用 CLI 安装

```bash
soha plugin install --profile local --repository https://github.com/owner/repository
```

CLI 先生成预览，再要求确认。没有稳定 Release 时，交互模式可选择分支，非交互模式需明确指定引用，例如 `--ref refs/heads/main`。每次运行都会重新预览，`--yes` 会跳过本次确认提示。非交互重跑时，使用仓库首页 URL，并用 `--ref <完整 Commit SHA> --yes` 固定已审阅的提交并确认。除非显式添加 `--enable`，仓库直装插件保持停用。

安装样例的 0.1.1 版本：

```bash
soha plugin install --profile local --repository https://github.com/opensoha/soha-plugin-example-skill-pack --ref v0.1.1
```

## 查看发布历史

在插件市场打开通过 GitHub 仓库登记的插件详情，选择 **查看发布历史**。列表按需加载作者仓库已发布的 GitHub Release。尚未安装时可选一个版本进行预览。直接粘贴仓库首页地址时，仍优先选择最新稳定 Release。

[官方仓库索引](https://marketplace.opensoha.com/marketplace/repositories.json)登记仓库地址。[历史目录](https://marketplace.opensoha.com/marketplace/index.json)另行保留旧版快照。样例 `v0.1.0` 的快照仍可查阅，旧目录已暂停该版本的安装。

## 同源升级

在插件市场的 **已安装** 视图查看同一仓库的可用更新，然后选择 **升级**。直接从仓库安装的插件也可在已安装详情页发起升级。每次升级都需预览并确认，使用已安装记录中的仓库和市场来源。

CLI 示例使用样例插件和明确的 Release 引用：

```bash
soha plugin upgrade --profile local --repository --ref refs/tags/v0.1.1 opensoha.example-skill-pack
```

可选传入 `--ref <branch-or-tag>` 指定目标。确认前检查新的固定提交、摘要、版本和新增权限。新增权限需要显式确认；在非交互模式下，用已审阅的完整提交 SHA 固定目标，并传入 `--yes`。有新增权限时，还需在审阅后传入 `--confirm-permission-increase`。若预览期间已安装记录发生变化，请重新操作。仓库接口失败时不会回退到旧市场升级路由。

查看插件需要 `plugin.view`，仓库预览和安装需要 `plugin.install`，确认升级需要 `plugin.upgrade`。安装只记录插件，不会授予其声明的运行时权限。另见[插件权限模型](./plugin-permissions.md)和[发布插件仓库](./publishing-plugin-repositories.md)。
