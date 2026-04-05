
# Veto 拓展仓库

这是 **Veto 联合国危机推演系统** 的官方插件与数据扩展仓库。本仓库负责托管Veto所需的各类军种定义、单位模板、自定义地图及预设剧本。

> **注意：** 本仓库仅作为数据源。推演引擎（Vercel 部署版）会自动从此处同步最新内容并持久化至浏览器本地存储。

---

## 📂 仓库结构

```text
.
├── registry.json             # 核心索引文件（商店列表）
├── mods/                     # 插件目录
│   └── author.example-mod/   # 插件唯一 ID 文件夹
│       ├── manifest.json     # 插件元数据（版本、作者、描述）
│       ├── definitions.json  # 核心定义（军种、大类、单位模板）
│       ├── i18n.json         # 文本覆盖（UI 标签自定义）
│       └── assets/           # 地图、图标等二进制资源
└── scenarios/                # 预设剧本（开局布阵快照）
```

---

## 🛠️ Mod 开发规范

本系统采用 **完全动态映射架构**，严禁在 Mod 中使用硬编码类型。

### 1. 军种与层级定义 (`definitions.json`)
你可以定义任何军种，甚至是太空军或网络部队。

```json
{
  "branches": [
    {
      "id": "space_force",
      "label": "远征太空军",
      "themeColor": "#00f2ff"
    }
  ],
  "categories": [
    {
      "id": "orbital_mecha",
      "branchId": "space_force",
      "label": "轨道机甲"
    }
  ],
  "unitTemplates": [
    {
      "id": "titan_01",
      "categoryId": "orbital_mecha",
      "label": "‘泰坦’级重型机甲",
      "natoIcon": "armor",
      "defaultStats": {
        "maxHp": 5000,
        "hardness": 0.85,
        "speed": 60
      }
    }
  ]
}
```

### 2. UI 文本覆盖 (`i18n.json`)
你可以修改系统默认的术语，以适配特定时代的推演场景。

```json
{
  "ui": {
    "unitStatus.moving": "相位跃迁中",
    "unitStatus.idle": "轨道驻留",
    "attribute.hp": "能量护盾值"
  }
}
```

---

## 📥 如何贡献

1. **Fork** 本仓库。
2. 在 `mods/` 目录下创建你的插件文件夹。
3. 按照规范编写 JSON 文件并将资源放入 `assets/`。
4. 在根目录的 `registry.json` 中添加你的 Mod 信息。
5. 提交 **Pull Request**。


---

## 📜 许可证

本项目插件遵循 **GPL3.0 License**。提交至本仓库的 Mod 默认视为对社区开放共享。