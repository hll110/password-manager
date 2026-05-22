# 🔐 密码管理器

[![GitHub](https://img.shields.io/badge/GitHub-hll110/password-manager-blue?style=flat-square&logo=github)](https://github.com/hll110/password-manager)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

安全便捷的账号密码管理工具，支持Web浏览器访问，适配小米14 H5端。

## ✨ 功能特点

- 🔒 **安全加密**: 所有密码使用AES加密存储，密钥本地保存
- 📱 **移动适配**: 完美适配小米14等手机浏览器
- 🎨 **美观界面**: 现代化UI设计，深色模式支持
- 📁 **分类管理**: 支持自定义分类，图标选择
- 📝 **版本管理**: 自动保存修改历史，支持版本回滚
- 🔍 **快速搜索**: 实时搜索账号标题、用户名、网址
- 📋 **一键复制**: 快速复制用户名和密码
- ⌨️ **快捷键**: 支持键盘快捷操作

## 📦 安装

### 方式一: 克隆仓库

```bash
git clone https://github.com/hll110/password-manager.git
cd password-manager
```

### 方式二: 直接下载

下载项目文件到本地目录。

### 方式三: Docker部署 (推荐)

```bash
# 克隆项目
git clone https://github.com/hll110/password-manager.git
cd password-manager

# 一键部署
chmod +x docker-deploy.sh
./docker-deploy.sh
```

## 🐳 Docker部署

### 快速部署

```bash
# 克隆项目
git clone https://github.com/hll110/password-manager.git
cd password-manager

# 一键部署
chmod +x docker-deploy.sh
./docker-deploy.sh
```

### 手动部署

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d

# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 数据持久化

数据库和密钥文件自动持久化到宿主机：

```
./db/passwords.db  # 加密的密码数据库
./db/.key          # 解密密钥
```

**重要**: 请妥善保管 `db/.key` 文件，丢失将无法解密密码！

### 备份与恢复

```bash
# 备份数据库
chmod +x backup.sh
./backup.sh

# 恢复数据库
chmod +x restore.sh
./restore.sh ./backups/passwords_backup_xxx.tar.gz
```

### 常用命令

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 查看日志
docker-compose logs -f

# 更新部署
git pull
docker-compose build
docker-compose up -d
```

### 环境变量

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `FLASK_ENV` | `production` | Flask环境 |
| `TZ` | `Asia/Shanghai` | 时区设置 |

### 端口配置

默认端口: `9090`

修改端口编辑 `docker-compose.yml`:

```yaml
ports:
  - "8080:9090"  # 将8080映射到容器的9090
```

## 🚀 快速开始

### 方式一：使用启动脚本（推荐）

```bash
chmod +x start.sh
./start.sh
```

### 方式二：手动启动

```bash
# 创建虚拟环境
python3 -m venv venv
source venv/bin/activate

# 安装依赖
pip install -r requirements.txt

# 启动服务
python3 app.py
```

启动后访问：
- 本机: http://localhost:9090
- 局域网: http://你的IP:9090

## 📱 小米14访问方法

1. 确保手机和电脑在同一局域网
2. 启动服务后，查看控制台输出的局域网地址
3. 在小米14浏览器中输入地址访问
4. 可以添加到主屏幕，获得类似App的体验

## ⌨️ 快捷键

- `Ctrl/Cmd + K`: 聚焦搜索框
- `Ctrl/Cmd + N`: 添加新账号
- `ESC`: 关闭弹窗

## 📂 目录结构

```
password-manager/
├── app.py              # Flask后端应用
├── requirements.txt    # Python依赖
├── start.sh           # 启动脚本
├── README.md          # 说明文档
├── db/                # 数据库目录
│   ├── passwords.db   # SQLite数据库
│   └── .key           # 加密密钥
├── static/            # 静态资源
│   ├── css/
│   │   └── style.css  # 样式文件
│   └── js/
│       └── app.js     # 前端逻辑
└── templates/         # HTML模板
    └── index.html     # 主页面
```

## 🔧 默认分类

- 💬 社交媒体
- 📧 邮箱
- 💼 工作
- 🎮 游戏
- 💰 金融
- 🛒 购物
- 👨‍💻 开发
- 📁 其他

支持自定义添加更多分类。

## 🛡️ 安全说明

1. **本地存储**: 所有数据存储在本地SQLite数据库
2. **加密存储**: 密码使用Fernet对称加密（AES-128）
3. **密钥保护**: 加密密钥保存在服务器本地
4. **无云端**: 不上传任何数据到云端

## 📝 使用建议

1. 首次使用建议先添加几个测试账号
2. 定期备份 `db/passwords.db` 文件
3. 保管好 `db/.key` 密钥文件，丢失将无法解密密码
4. 建议在受信任的网络环境中使用

## 🐛 常见问题

**Q: 忘记密钥文件怎么办？**
A: 如果丢失 `.key` 文件，已加密的密码将无法解密。建议定期备份。

**Q: 如何修改端口？**
A: 编辑 `app.py` 文件最后一行，修改 `port=8080` 为其他端口。

**Q: 如何在公网访问？**
A: 不建议直接暴露到公网。如需远程访问，建议使用VPN或内网穿透。

## 📄 许可证

MIT License

## 👨‍💻 作者

密码管理器 - 安全便捷的账号管理工具
