# 🐳 Docker部署指南

## 快速开始

### 1. 克隆项目
```bash
git clone https://github.com/hll110/password-manager.git
cd password-manager
```

### 2. 一键部署
```bash
chmod +x docker-deploy.sh
./docker-deploy.sh
```

### 3. 访问应用
- 本机: http://localhost:9090
- 局域网: http://你的IP:9090

## 数据持久化

数据库文件自动持久化到宿主机：

```
./db/
├── passwords.db  # 加密的密码数据库
└── .key          # 解密密钥 (重要!)
```

**重要**: 请妥善保管 `db/.key` 文件！

## 备份与恢复

### 备份数据库
```bash
chmod +x backup.sh
./backup.sh
```

备份文件保存在 `./backups/` 目录。

### 恢复数据库
```bash
chmod +x restore.sh
./restore.sh ./backups/passwords_backup_xxx.tar.gz
```

## 常用命令

```bash
# 查看容器状态
docker ps | grep password-manager

# 查看日志
docker logs -f password-manager

# 停止服务
docker stop password-manager

# 启动服务
docker start password-manager

# 重启服务
docker restart password-manager

# 删除容器
docker rm -f password-manager

# 删除镜像
docker rmi password-manager
```

## 更新部署

```bash
# 拉取最新代码
git pull

# 重新构建并部署
./docker-deploy.sh
```

## 自定义配置

### 修改端口
编辑 `docker-deploy.sh`，修改 `PORT` 变量。

### 修改时区
编辑 `docker-deploy.sh`，修改 `TZ` 环境变量。

### 添加环境变量
在 `docker run` 命令中添加 `-e VARIABLE=value`。

## 故障排除

### 容器无法启动
```bash
# 查看详细日志
docker logs password-manager

# 检查端口占用
netstat -tlnp | grep 9090
```

### 数据丢失
```bash
# 检查数据卷
ls -la db/

# 从备份恢复
./restore.sh ./backups/最新备份文件.tar.gz
```

### 权限问题
```bash
# 修复目录权限
sudo chown -R 1000:1000 db/
```

## 生产环境建议

1. **定期备份**: 设置定时任务自动备份
2. **监控日志**: 定期检查容器日志
3. **更新镜像**: 定期更新基础镜像
4. **安全配置**: 使用反向代理和HTTPS

## 定时备份示例

```bash
# 编辑crontab
crontab -e

# 添加每日凌晨2点备份
0 2 * * * cd /path/to/password-manager && ./backup.sh >> /var/log/password-backup.log 2>&1
```

## 相关文件

- `Dockerfile`: Docker镜像定义
- `docker-compose.yml`: 容器编排配置
- `docker-deploy.sh`: 一键部署脚本
- `backup.sh`: 数据库备份脚本
- `restore.sh`: 数据库恢复脚本
- `.dockerignore`: Docker构建忽略文件
