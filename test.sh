#!/bin/bash

# 密码管理器测试脚本

echo "🔍 测试密码管理器服务..."
echo ""

# 检查服务是否运行
if curl -s http://localhost:9090 > /dev/null 2>&1; then
    echo "✅ 服务正在运行"
else
    echo "❌ 服务未运行"
    exit 1
fi

# 测试API接口
echo ""
echo "📡 测试API接口..."

# 获取分类
echo "  - 获取分类列表..."
curl -s http://localhost:9090/api/categories | head -c 100
echo ""

# 获取账号列表
echo "  - 获取账号列表..."
curl -s http://localhost:9090/api/accounts | head -c 100
echo ""

# 获取统计信息
echo "  - 获取统计信息..."
curl -s http://localhost:9090/api/stats | head -c 100
echo ""

echo ""
echo "✅ 测试完成"
echo ""
echo "🌐 访问地址: http://localhost:9090"
