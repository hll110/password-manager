#!/bin/bash

# Docker部署脚本 (无需docker-compose)

set -e

IMAGE_NAME="password-manager"
CONTAINER_NAME="password-manager"
PORT=9090

echo "🔐 密码管理器 Docker 部署"
echo "========================="
echo ""

# 检查Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

# 创建必要的目录
echo "📁 创建目录..."
mkdir -p db logs

# 检查是否存在旧的数据库文件
if [ -f "db/passwords.db" ]; then
    echo "✅ 发现现有数据库文件，将使用现有数据"
else
    echo "📝 首次运行，将创建新的数据库"
fi

# 停止并删除旧容器
echo ""
echo "⏹️  清理旧容器..."
docker stop "$CONTAINER_NAME" 2>/dev/null || true
docker rm "$CONTAINER_NAME" 2>/dev/null || true

# 构建镜像
echo ""
echo "🔨 构建Docker镜像..."
docker build -t "$IMAGE_NAME" .

# 启动容器
echo ""
echo "🚀 启动容器..."
docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "$PORT:9090" \
    -v "$(pwd)/db:/app/db" \
    -v "$(pwd)/logs:/app/logs" \
    -e FLASK_ENV=production \
    -e TZ=Asia/Shanghai \
    "$IMAGE_NAME"

# 等待服务启动
echo ""
echo "⏳ 等待服务启动..."
sleep 5

# 检查容器状态
echo ""
echo "📊 检查容器状态..."
docker ps | grep "$CONTAINER_NAME" || echo "容器未运行"

# 获取访问地址
echo ""
echo "🌐 访问地址:"
echo "   本机: http://localhost:$PORT"
echo "   局域网: http://$(hostname -I | awk '{print $1}'):$PORT"

echo ""
echo "✅ 部署完成！"
echo ""
echo "📋 常用命令:"
echo "   查看日志: docker logs -f $CONTAINER_NAME"
echo "   停止服务: docker stop $CONTAINER_NAME"
echo "   启动服务: docker start $CONTAINER_NAME"
echo "   重启服务: docker restart $CONTAINER_NAME"
echo "   删除容器: docker rm -f $CONTAINER_NAME"
