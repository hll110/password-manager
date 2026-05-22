#!/bin/bash

# 数据库恢复脚本

set -e

echo "🔄 密码管理器数据库恢复"
echo "========================"
echo ""

# 检查备份文件
if [ -z "$1" ]; then
    echo "使用方法: $0 <备份文件.tar.gz>"
    echo ""
    echo "可用备份文件:"
    ls -lh ./backups/*.tar.gz 2>/dev/null || echo "   没有找到备份文件"
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ 备份文件不存在: $BACKUP_FILE"
    exit 1
fi

# 停止服务
echo "⏹️  停止服务..."
docker-compose down 2>/dev/null || true

# 创建临时目录
TEMP_DIR=$(mktemp -d)
echo "📁 解压备份文件..."
tar -xzf "$BACKUP_FILE" -C "$TEMP_DIR"

# 查找数据库文件
DB_FILE=$(find "$TEMP_DIR" -name "*.db" | head -1)
KEY_FILE=$(find "$TEMP_DIR" -name ".key*" | head -1)

if [ -z "$DB_FILE" ]; then
    echo "❌ 备份文件中没有找到数据库文件"
    rm -rf "$TEMP_DIR"
    exit 1
fi

# 恢复数据库
echo "🔄 恢复数据库..."
mkdir -p db
cp "$DB_FILE" "db/passwords.db"

# 恢复密钥
if [ -n "$KEY_FILE" ]; then
    echo "🔑 恢复密钥文件..."
    cp "$KEY_FILE" "db/.key"
fi

# 清理临时目录
rm -rf "$TEMP_DIR"

# 重启服务
echo "🚀 重启服务..."
docker-compose up -d

echo ""
echo "✅ 恢复完成！"
echo "📊 数据库大小: $(du -h db/passwords.db | cut -f1)"
echo ""
echo "🌐 访问地址: http://localhost:9090"
