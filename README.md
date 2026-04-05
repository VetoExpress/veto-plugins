# CrisisSim-Registry · Veto 插件注册中心

**CrisisSim-Registry** 是 **Veto 联合国危机推演系统**的官方插件注册中心。  
开发者在此提交插件注册信息，CI 自动将插件实体同步至本仓库，最终生成供 Vercel 前端消费的 `dist/registry.json`。

---

## 📂 仓库结构

```text
.
├── manifest-schema.json      # 插件 manifest.json 的 JSON Schema 校验规范
├── registry.json             # （保留）遗留索引，已由 dist/ 接替
│
├── plugin-list/              # 开发者提交的插件注册源文件（每个文件对应一个插件）
│   └── {author}.{plugin}.json
│
├── plugins-data/             # CI 自动同步后的插件实体文件（勿手动编辑）
│   └── {plugin-id}/
│       ├── manifest.json     # 插件元数据（来自源仓库）
│       ├── definitions.json  # 单位/阵营定义数据
│       ├── i18n/             # 语言包文件（zh-CN.json / en-US.json …）
│       └── assets/           # 地图底图、单位图标等二进制资源
│
├── commit-info/              # 每个插件源仓库的最后同步 Commit Hash 记录
│   └── {plugin-id}.json
│
├── dist/                     # 脚本生成的最终产物（供前端直接消费）
│   └── registry.json
│
└── scripts/                  # 自动化同步与构建脚本
    ├── sync.js               # 拉取各插件源仓库并更新 plugins-data/
    └── build.js              # 聚合生成 dist/registry.json
```

---

## 🔄 数据流

```
开发者 PR (plugin-list/*.json)
        ↓  CI 审核合并
scripts/sync.js  ──拉取源仓库──►  plugins-data/{id}/
        ↓  写入最新 Hash
commit-info/{id}.json
        ↓
scripts/build.js  ──聚合──►  dist/registry.json
        ↓
Vercel 边缘网络（前端消费）
```

---

## 📥 如何提交插件

### 第一步：准备源仓库

在你自己的 GitHub 仓库中，确保根目录包含以下文件：

```text
your-plugin-repo/
├── manifest.json       # 必须通过 manifest-schema.json 校验
├── definitions.json    # 或按规范拆分为多个文件
├── i18n/
│   ├── zh-CN.json
│   └── en-US.json
└── assets/
    └── preview.png     # 预览图（1280×720 推荐）
```

### 第二步：创建注册文件

在本仓库的 `plugin-list/` 目录下新增一个 JSON 文件，格式为 `{author}.{plugin-slug}.json`：

```jsonc
{
  "id": "author.my-plugin",        // 与 manifest.json 中的 id 完全一致
  "repo": "author/my-plugin-repo", // GitHub 仓库，格式 owner/repo
  "branch": "main",                // 同步的分支名
  "author": "author"               // GitHub 用户名
}
```

### 第三步：提交 PR

提交 Pull Request 至本仓库 `main` 分支，CI 会自动：

1. 校验注册文件格式。
2. 拉取源仓库并验证 `manifest.json` 符合 [manifest-schema.json](./manifest-schema.json)。
3. 同步实体文件至 `plugins-data/`，记录 Commit Hash 至 `commit-info/`。
4. 重新生成 `dist/registry.json`。

---

## 📋 manifest.json 规范速查

> 完整 Schema 定义见 [manifest-schema.json](./manifest-schema.json)，可在支持 JSON Schema 的编辑器（如 VS Code）中获得实时校验。

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `manifest_version` | `integer` | ✅ | 固定为 `1` |
| `id` | `string` | ✅ | 全局唯一 ID，格式 `author.plugin`（小写） |
| `name` | `string` | ✅ | 插件展示名称 |
| `version` | `string` | ✅ | SemVer 版本号，如 `1.0.0` |
| `author` | `string` | ✅ | 作者名称 |
| `type` | `string` | ✅ | `faction` / `scenario` / `ruleset` / `campaign` / `utility` / `dependency` |
| `preview` | `string` | — | 预览图相对路径，如 `assets/preview.png` |
| `description` | `string` | — | 插件简介（最多 512 字符） |
| `min_engine_version` | `string` | — | 引擎最低版本，支持 SemVer 范围，如 `>=1.2.0` |
| `definitions` | `string \| object` | — | 单位定义 JSON 路径或多文件拆分配置 |
| `i18n` | `string \| object` | — | 语言包路径或 `{ "zh-CN": "i18n/zh-CN.json" }` |
| `dependencies` | `string[]` | — | 依赖的其他插件 ID 数组 |
| `tags` | `string[]` | — | 最多 10 个标签，如 `["modern", "naval"]` |
| `license` | `string` | — | SPDX 标识符，如 `GPL-3.0-or-later` |

### 最小合法示例

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/VetoExpress/veto-plugins/main/manifest-schema.json",
  "manifest_version": 1,
  "id": "veto.official-modern",
  "name": "现代战争基础包",
  "version": "1.0.0",
  "author": "VetoExpress",
  "type": "faction",
  "preview": "assets/preview.png",
  "description": "包含现代陆海空三军基础单位模板，作为其他现代题材 Mod 的依赖库。",
  "min_engine_version": ">=1.0.0",
  "definitions": "definitions.json",
  "i18n": {
    "zh-CN": "i18n/zh-CN.json",
    "en-US": "i18n/en-US.json"
  },
  "dependencies": [],
  "tags": ["modern", "official"],
  "license": "GPL-3.0"
}
```

---

## 📜 许可证

本仓库基础框架及脚本遵循 **GPL-3.0**。  
开发者提交至 `plugin-list/` 的插件，其许可证以插件自身 `manifest.json` 中的 `license` 字段为准。
