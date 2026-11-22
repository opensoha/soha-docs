# 发布插件仓库

本指南面向希望用户从公开 GitHub 仓库预览并直装声明式插件的作者。仓库直装与官方市场收录相互独立：发布一个仓库不会自动让插件成为官方插件，也不会自动加入市场目录。

在 [Soha 插件模板](https://github.com/opensoha/soha-plugin-template) 中选择 **Use this template**，创建自己的仓库。在根清单里填写自己的插件 ID、发布者和版本。模板内置清单校验工作流。

## 仓库要求

- 仓库根目录只放一个可安装插件，文件名为 `plugin.manifest.json`。
- 使用有效的 Soha 插件 manifest，并将 `runtime.mode` 设为 `manifest-only`。此流程只读取根 manifest，不会克隆仓库、下载相对路径资产或运行仓库脚本。
- 将 manifest 作为原始 JSON 字节发布。Soha 对这些确切字节计算并记录 `sha256:<hex>`，其中包括空格、换行和字段顺序；格式化或调整字段顺序都会改变摘要。
- 已发布的插件版本不可变。需要改变内容时，发布新的 manifest 版本和新的 Git 提交；不要替换已发布版本对应的内容。

样例使用插件 ID `opensoha.example-skill-pack` 和 Git 标签 `v0.1.1`。[Soha Example Skill Pack](https://github.com/opensoha/soha-plugin-example-skill-pack/releases/tag/v0.1.1)

## 加入官方目录

插件源码保留在作者自己的仓库。向官方仓库索引提交插件 ID、展示信息和公开 GitHub 仓库地址。每个新 manifest 版本发布一个稳定 GitHub Release，并用对应的标签，例如 manifest 版本 `0.1.2` 对应标签 `v0.1.2`。Soha 按需读取版本历史，并将每次安装固定到提交和清单摘要。官方市场在冻结的旧目录入口保留已有快照。

仓库索引由 [Soha 官方市场](https://marketplace.opensoha.com/marketplace/repositories.json) 提供。

是否官方收录由服务端的受信任来源配置决定。manifest 中的 publisher、签名文本或其他自我声明字段都不能授予官方身份或已验签状态。

## 分享前校验

在 Soha 源码检出中，使用以下命令校验分发样例：

```bash
node contracts/scripts/verify-plugin-distribution-example.mjs
```

该检查会校验样例 manifest 和目录 Schema、目录中的相对快照引用、manifest 内容一致性及原始字节 SHA-256 摘要。发布仓库的验证工作流应执行同类检查，并拒绝覆盖已发布的版本快照。

在样例仓库中运行 `npm ci --ignore-scripts` 和 `npm test`。如需查看 manifest 的原始字节摘要，运行 `shasum -a 256 plugin.manifest.json`，再将结果与安装预览中的 `sha256:` 摘要比较。

## 支持边界

首版仓库流程仅支持公开 GitHub 仓库。私有仓库、任意 Git 托管平台、pull request 或 issue URL、`/blob/` 文件 URL 和子目录 manifest 均不支持。不要在仓库 URL 中放入凭据。摘要有效只证明字节与已审阅的预览相符，不证明作者身份，也不代表插件安全。
