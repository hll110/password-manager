# 🔐 密码管理器

[![GitHub](https://img.shields.io/badge/GitHub-hll110/password-manager-blue?style=flat-square&logo=github)](https://github.com/hll110/password-manager)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-supported-2496ED?style=flat-square&logo=docker)](DOCKER_GUIDE.md)

> 安全、简洁、自托管的账号密码管理工具。数据本地加密存储，支持 Web 浏览器和移动端 PWA 访问。

---

## 📸 界面预览

- 💻 **桌面端**：侧边栏分类 + 卡片式账号网格，支持搜索、排序、收藏
- 📱 **移动端**：底部导航 + 手势操作，完美适配手机浏览器，可添加到主屏幕作为独立 App 使用
- 🌓 **深色模式**：一键切换浅色/深色主题

---

## ✨ 功能特点

| 功能 | 说明 |
|------|------|
| 🔒 **本地加密** | 密码使用 Fernet (AES-128-CBC) 加密，密钥仅保存在服务器本地 |
| 📱 **PWA 支持** | 支持添加到手机/桌面主屏幕，离线可用体验 |
| 📁 **分类管理** | 8 种默认分类，支持自定义图标和新增分类 |
| 📝 **版本历史** | 自动保存每次修改记录，支持一键回滚到任意版本 |
| 📥 **批量导入** | 支持 **Excel (.xlsx)** / CSV / TSV 导入，带实时进度条和结果统计 |
| 📤 **数据导出** | 一键导出 JSON 备份，支持跨设备迁移 |
| 🔍 **实时搜索** | 支持标题、用户名、网址、备注全文检索 |
| ⭐ **收藏夹** | 常用账号加入收藏，快速筛选 |
| 🎨 **深色模式** | 自动/手动切换，保护夜间视力 |
| ⌨️ **快捷操作** | ESC 关闭弹窗，一键复制用户名/密码 |

---

## 🚀 快速开始

### 方式一：Docker 部署（推荐）

```bash
git clone https://github.com/hll110/password-manager.git
cd password-manager

# 创建数据目录并确保权限正确
mkdir -p db logs

# 一键部署
chmod +x docker-deploy.sh
./docker-deploy.sh
```

访问 http://localhost:9090

### 方式二：Docker Compose

```bash
git clone https://github.com/hll110/password-manager.git
cd password-manager
mkdir -p db logs
docker-compose up -d --build
```

### 方式三：本地运行

```bash
git clone https://github.com/hll110/password-manager.git
cd password-manager

chmod +x start.sh
./start.sh
```

---

## 🐳 Docker 详解

### 数据持久化

容器通过 **Bind Mount** 将数据映射到宿主机本地目录：

| 宿主机路径 | 容器路径 | 说明 |
|-----------|---------|------|
| `./db` | `/app/db` | SQLite 数据库 + 加密密钥 |
| `./logs` | `/app/logs` | 运行日志 |

**关键文件：**
- `db/passwords.db` — 加密后的账号数据库
- `db/.key` — 加密密钥（**务必妥善备份，丢失将无法解密密码**）

> ⚠️ **注意**：首次部署前请确保宿主机 `./db` 目录已创建。如使用 `docker-deploy.sh` 脚本，会自动创建。

### 常用命令

```bash
# 启动
docker-compose up -d

# 停止
docker-compose down

# 重启
docker-compose restart

# 查看日志
docker-compose logs -f

# 更新（拉取新代码后）
git pull
docker-compose up -d --build
```

### 自定义端口

编辑 `docker-compose.yml`：

```yaml
ports:
  - "8080:9090"  # 将宿主机 8080 映射到容器 9090
```

---

## 📥 批量导入指南

支持从 Excel / CSV / TSV 文件一键导入账号。

### 操作步骤

1. 点击右上角 **设置** → **批量导入 (CSV)**
2. **上传文件**：支持 `.xlsx`、`.csv`、`.txt` 格式
3. **预览确认**：勾选"第一行是表头"（如有），确认数据映射正确
4. **开始导入**：系统按每批 10 条提交，实时显示：
   - 📊 进度条（已处理 / 总计）
   - ✅ 成功计数
   - ❌ 失败计数及具体错误信息
5. 完成后点击"完成"，自动刷新账号列表

### 格式要求

Excel 或 CSV 文件建议按以下列顺序：

| 第1列 | 第2列 | 第3列 | 第4列 |
|-------|-------|-------|-------|
| 名称 | 账号 | 密码 | 网站 |

示例：
```csv
GitHub,admin@example.com,mypassword123,https://github.com
微信,wxid001,pass456,
```

- 内容含逗号时，用英文双引号包裹：`"公司,官网",admin,pass,https://a.com`
- 缺失的列可留空，但"名称"不能为空

---

## 📱 添加到主屏幕（PWA）

### Android / 小米 14

1. 确保手机与服务器在同一局域网（或服务器有公网访问）
2. 用 Chrome / 系统浏览器访问服务地址
3. 点击菜单 → **"添加到主屏幕"**
4. 获得沉浸式全屏体验，独立图标，像原生 App 一样使用

### iOS (Safari)

1. Safari 打开服务地址
2. 点击底部 **分享按钮** → **"添加到主屏幕"**

---

## ⌨️ 快捷键

| 按键 | 功能 |
|------|------|
| `ESC` | 关闭弹窗 / 侧边栏 |

---

## 🔧 默认分类

| 图标 | 分类 |
|:----:|------|
| 💬 | 社交媒体 |
| 📧 | 邮箱 |
| 💼 | 工作 |
| 🎮 | 游戏 |
| 💰 | 金融 |
| 🛒 | 购物 |
| 👨‍💻 | 开发 |
| 📁 | 其他 |

支持在界面中随时添加自定义分类。

---

## 🛡️ 安全说明

1. **完全本地**：所有数据存储在服务器本地 SQLite 数据库，不上传任何云端
2. **加密存储**：密码字段使用 Fernet 对称加密（AES-128-CBC + HMAC）
3. **密钥本地保存**：加密密钥 `db/.key` 与数据库分离存储，请务必备份
4. **网络建议**：不建议直接暴露到公网。如需远程访问，请使用 VPN 或内网穿透工具（如 frp、Cloudflare Tunnel）

---

## 💾 备份与恢复

```bash
# 备份（打包 db 目录和密钥）
chmod +x backup.sh
./backup.sh

# 恢复
chmod +x restore.sh
./restore.sh ./backups/passwords_backup_xxx.tar.gz
```

> 建议定期执行备份，并将备份文件同步到安全位置。

---

## ⚙️ 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `FLASK_ENV` | `production` | Flask 运行环境 |
| `TZ` | `Asia/Shanghai` | 时区 |
| `PORT` | `9090` | 服务端口（本地运行时） |

---

## 📂 目录结构

```
password-manager/
├── app.py                 # Flask 后端主程序
├── requirements.txt       # Python 依赖
├── docker-compose.yml     # Docker Compose 配置
├── Dockerfile             # Docker 镜像构建
├── start.sh               # 本地启动脚本
├── docker-deploy.sh       # Docker 一键部署脚本
├── backup.sh              # 数据备份脚本
├── restore.sh             # 数据恢复脚本
├── db/                    # 数据持久化目录（运行后生成）
│   ├── passwords.db       # SQLite 数据库
│   └── .key               # 加密密钥
├── static/                # 前端静态资源
│   ├── css/style.css
│   └── js/app.js
└── templates/
    └── index.html         # 主页面
```

---

## ❓ 常见问题

**Q: 为什么 Docker 部署后 db 目录里没有文件？**
A: 请确保：
1. 宿主机 `./db` 目录已提前创建（`mkdir -p db`）
2. 重建了镜像（`docker-compose up -d --build`），使 Dockerfile 中的权限设置生效
3. 容器成功启动且无报错（查看 `docker-compose logs`）

**Q: 丢失 `db/.key` 密钥文件怎么办？**
A: 密钥丢失后，数据库中所有已加密密码将无法解密。请务必定期备份 `db/` 整个目录。

**Q: 如何修改运行端口？**
A: 
- Docker：修改 `docker-compose.yml` 中的 `ports` 映射
- 本地：启动前设置环境变量 `PORT=8080`，或修改 `app.py` 最后一行

**Q: 支持多用户吗？**
A: 当前版本为单用户设计，没有账号登录体系。适合个人或小团队在内网使用。

---

## 📄 许可证

[MIT License](LICENSE)

---

## 👨‍💻 作者

密码管理器 — 安全便捷的本地账号管理工具

如有问题或建议，欢迎提交 [Issue](https://github.com/hll110/password-manager/issues)。
