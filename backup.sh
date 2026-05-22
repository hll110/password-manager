#!/bin/bash

# 数据库备份脚本

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/passwords_backup_$TIMESTAMP.db"

echo "💾 密码管理器数据库备份"
echo "========================"
echo ""

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 检查数据库文件是否存在
if [ ! -f "db/passwords.db" ]; then
    echo "❌ 数据库文件不存在: db/passwords.db"
    exit 1
fi

# 备份数据库
echo "📦 备份数据库..."
cp "db/passwords.db" "$BACKUP_FILE"

# 备份密钥文件
if [ -f "db/.key" ]; then
    cp "db/.key" "$BACKUP_DIR/.key_backup_$TIMESTAMP"
    echo "🔑 密钥文件已备份"
fi

# 压缩备份
echo "🗜️  压缩备份文件..."
tar -czf "$BACKUP_FILE.tar.gz" -C "$BACKUP_DIR" "$(basename $BACKUP_FILE)" "$(basename $BACKUP_DIR/.key_backup_$TIMESTAMP 2>/dev/null || echo '')"

# 清理未压缩的文件
rm -f "$BACKUP_FILE"
rm -f "$BACKUP_DIR/.key_backup_$TIMESTAMP"

echo ""
echo "✅ 备份完成！"
echo "📁 备份文件: $BACKUP_FILE.tar.gz"
echo "📊 文件大小: $(du -h "$BACKUP_FILE.tar.gz" | cut -f1)"
echo ""
echo "📋 备份说明:"
echo "   - 包含加密的密码数据库"
echo "   - 包含解密密钥"
echo "   - 请妥善保管备份文件"
