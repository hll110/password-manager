# GitHub 仓库创建指南

## 🚀 快速方法 (使用脚本)

```bash
cd /opt/Project/password-manager
./github-setup.sh YOUR_GITHUB_TOKEN
```

## 📝 手动方法

### 步骤1: 创建GitHub Personal Access Token

1. 登录 GitHub
2. 点击右上角头像 → **Settings**
3. 左侧菜单 → **Developer settings**
4. → **Personal access tokens** → **Tokens (classic)**
5. → **Generate new token** → **Generate new token (classic)**
6. 填写:
   - Note: `密码管理器`
   - Expiration: `90 days` (或自定义)
   - 勾选权限: **repo** (完整仓库权限)
7. 点击 **Generate token**
8. **复制token** (只显示一次！)

### 步骤2: 在GitHub创建仓库

访问: https://github.com/new

填写:
- Repository name: `password-manager`
- Description: `🔐 安全便捷的账号密码管理工具`
- 选择: **Public**
- **不要勾选** 任何初始化选项 (README, .gitignore, license)
- 点击 **Create repository**

### 步骤3: 推送代码

```bash
cd /opt/Project/password-manager

# 方法A: 使用token认证
git remote add origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/password-manager.git
git push -u origin master

# 方法B: 使用GitHub CLI
gh auth login
gh repo create password-manager --public --source=. --remote=origin
git push -u origin master
```

## 📋 验证推送成功

```bash
# 查看远程仓库
git remote -v

# 查看提交历史
git log --oneline

# 访问仓库
# https://github.com/YOUR_USERNAME/password-manager
```

## ⚠️ 注意事项

1. Token 只显示一次，请妥善保存
2. 不要将 Token 提交到代码中
3. Token 有权限范围和有效期限制
4. 创建仓库时不要初始化 README/.gitignore

## 🔧 常见问题

**Q: 提示 "remote origin already exists"**
```bash
git remote remove origin
git remote add origin https://TOKEN@github.com/USER/REPO.git
```

**Q: 提示 "Permission denied"**
- 检查 Token 是否正确
- 检查 Token 是否有 repo 权限
- 检查仓库名是否正确

**Q: 推送被拒绝**
```bash
git pull origin master --rebase
git push -u origin master
```
