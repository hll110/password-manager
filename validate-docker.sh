#!/bin/bash

# Docker文件验证脚本

echo "🔍 验证Docker配置文件"
echo "====================="
echo ""

# 检查必要文件
echo "📁 检查文件..."
files=("Dockerfile" "docker-compose.yml" ".dockerignore" "docker-deploy.sh" "backup.sh" "restore.sh")
for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file (缺失)"
    fi
done

echo ""
echo "📋 验证Dockerfile语法..."
if command -v docker &> /dev/null; then
    docker build --no-cache -t password-manager-test . 2>&1 | grep -E "(Step|Successfully|error|ERROR)" | head -10
else
    echo "⚠️  Docker未安装，跳过构建测试"
fi

echo ""
echo "📊 文件统计:"
echo "   Dockerfile行数: $(wc -l < Dockerfile)"
echo "   docker-compose.yml行数: $(wc -l < docker-compose.yml)"
echo "   .dockerignore行数: $(wc -l < .dockerignore)"
echo "   脚本文件数: $(ls *.sh 2>/dev/null | wc -l)"

echo ""
echo "✅ 验证完成"
