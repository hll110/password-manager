#!/bin/bash

# 密码管理器启动脚本

echo "🔐 密码管理器 - 安全便捷的账号管理工具"
echo "========================================"
echo ""

# 检查Python
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未找到 python3"
    exit 1
fi

# 进入项目目录
cd "$(dirname "$0")"

# 创建虚拟环境（如果不存在）
if [ ! -d "venv" ]; then
    echo "📦 创建虚拟环境..."
    python3 -m venv venv
fi

# 激活虚拟环境
source venv/bin/activate

# 安装依赖
echo "📥 安装依赖..."
pip install -r requirements.txt -q

# 创建必要目录
mkdir -p db

# 启动服务
echo ""
echo "🚀 启动服务..."
echo "📍 访问地址: http://localhost:9090"
echo "📍 局域网访问: http://$(hostname -I | awk '{print $1}'):9090"
echo ""
echo "按 Ctrl+C 停止服务"
echo ""

python3 app.py
