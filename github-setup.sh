#!/bin/bash

# GitHub仓库创建和推送脚本
# 使用方法: ./github-setup.sh YOUR_GITHUB_TOKEN

if [ -z "$1" ]; then
    echo "使用方法: $0 YOUR_GITHUB_TOKEN"
    echo ""
    echo "示例: $0 ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    echo ""
    echo "获取Token: GitHub → Settings → Developer settings → Personal access tokens → Generate new token"
    exit 1
fi

TOKEN="$1"
REPO_NAME="password-manager"
REPO_DESC="🔐 安全便捷的账号密码管理工具 - 支持Web访问，适配小米14 H5端"

echo "🚀 开始创建GitHub仓库..."
echo ""

# 方法1: 使用gh CLI认证并创建
echo "📦 方法1: 使用GitHub CLI"
echo "------------------------"

# 使用token认证
echo "$TOKEN" | gh auth login --with-token

if gh auth status > /dev/null 2>&1; then
    echo "✅ GitHub认证成功"
    
    # 创建仓库
    echo "📁 创建仓库: $REPO_NAME"
    gh repo create "$REPO_NAME" --public --description "$REPO_DESC" --source=. --remote=origin
    
    if [ $? -eq 0 ]; then
        echo "✅ 仓库创建成功"
        
        # 推送代码
        echo "📤 推送代码到GitHub..."
        git push -u origin master
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "🎉 完成！"
            echo "📍 仓库地址: https://github.com/$(gh api user --jq .login)/$REPO_NAME"
        else
            echo "❌ 推送失败"
        fi
    else
        echo "❌ 仓库创建失败，可能仓库已存在"
        echo "尝试直接推送..."
        git remote add origin "https://$TOKEN@github.com/$(gh api user --jq .login)/$REPO_NAME.git" 2>/dev/null
        git push -u origin master
    fi
else
    echo "❌ GitHub CLI认证失败"
    echo ""
    echo "📦 方法2: 使用原生Git命令"
    echo "------------------------"
    
    # 获取用户名
    USERNAME=$(curl -s -H "Authorization: token $TOKEN" https://api.github.com/user | grep -o '"login":"[^"]*' | cut -d'"' -f4)
    
    if [ -z "$USERNAME" ]; then
        echo "❌ 无法获取GitHub用户名，请检查Token是否正确"
        exit 1
    fi
    
    echo "👤 GitHub用户名: $USERNAME"
    
    # 创建仓库
    echo "📁 创建仓库: $REPO_NAME"
    curl -s -H "Authorization: token $TOKEN" \
         -H "Content-Type: application/json" \
         -d "{\"name\":\"$REPO_NAME\",\"description\":\"$REPO_DESC\",\"private\":false}" \
         https://api.github.com/user/repos > /dev/null
    
    # 添加远程仓库
    git remote remove origin 2>/dev/null
    git remote add origin "https://$TOKEN@github.com/$USERNAME/$REPO_NAME.git"
    
    # 推送代码
    echo "📤 推送代码到GitHub..."
    git push -u origin master
    
    if [ $? -eq 0 ]; then
        echo ""
        echo "🎉 完成！"
        echo "📍 仓库地址: https://github.com/$USERNAME/$REPO_NAME"
    else
        echo "❌ 推送失败"
    fi
fi
