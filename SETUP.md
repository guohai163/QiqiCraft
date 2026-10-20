# 🚀 Linux 环境下基于 Docker Compose 部署指南

本文档说明如何在 Linux 服务器（家庭 NAS、云服务器或树莓派/迷你主机等）上，通过 Docker Compose 快速部署 **淇淇方块学院 (QiqiCraft Academy)**。

---

## 📋 准备工作

确保你的 Linux 系统已安装 **Docker** 和 **Docker Compose**（Docker 20.10+ 及 Docker Compose v2+）。

若尚未安装，可快速执行官方脚本安装：
```bash
# Ubuntu / Debian 安装 Docker
curl -fsSL https://get.docker.com | bash -s docker
sudo systemctl enable --now docker

# 验证安装
docker --version
docker compose version
```

---

## 🛠️ 部署方式

### 方式一：直接使用预构建镜像（推荐，极简）

只需新建一个目录并下载 `docker-compose.yml` 即可运行，无需下载全部源代码：

1. **创建并进入部署目录**：
   ```bash
   mkdir -p ~/qiqicraft && cd ~/qiqicraft
   ```

2. **配置环境变量 `.env`**：
   创建 `.env` 文件并填入家长管理密码和 OpenAI 视觉模型配置：
   ```bash
   cat << 'EOF' > .env
   # 服务端口
   PORT=3001

   # 家长管理面板密码（默认 1234，可自行修改）
   PARENT_PIN=1234

   # 小朋友的冒险昵称
   CHILD_NAME=小矿工淇淇

   # OpenAI / AI 视觉模型配置（支持中转代理和各种兼容 OpenAI 格式的模型）
   OPENAI_API_KEY=sk-your-openai-api-key-here
   OPENAI_BASE_URL=https://api.openai.com/v1
   OPENAI_MODEL=gpt-4o
   EOF
   ```

3. **创建 `docker-compose.yml`**：
   ```yaml
   services:
     qiqicraft:
       image: ghcr.io/guohai163/qiqicraft:latest
       container_name: qiqicraft
       restart: unless-stopped
       ports:
         - "3001:3001"
       env_file:
         - .env
       volumes:
         - ./data:/app/data
         - ./.env:/app/.env
   ```

4. **创建数据持久化目录**：
   ```bash
   mkdir -p data/uploads
   ```

5. **启动容器**：
   ```bash
   docker compose up -d
   ```

---

### 方式二：从源码本地构建并运行（可选）

如果对代码进行了二次开发，想要在本地直接编译构建：

1. **克隆代码仓库**：
   ```bash
   git clone https://github.com/guohai163/QiqiCraft.git
   cd QiqiCraft
   ```

2. **配置环境变量**：
   ```bash
   cp .env.example .env
   # 使用 nano 或 vim 编辑 .env 填写你的 OpenAI API Key 和家长密码 PARENT_PIN
   nano .env
   ```

3. **本地构建镜像并启动**：
   ```bash
   docker build -t ghcr.io/guohai163/qiqicraft:latest .
   docker compose up -d
   ```

---

## 📱 iPad / 局域网设备访问

1. **获取 Linux 服务器的局域网 IP**：
   ```bash
   hostname -I
   # 例如：192.168.1.100
   ```

2. **在 iPad 上访问**：
   - 确保 iPad 与 Linux 服务器处于同一 Wi-Fi 局域网。
   - 用 iPad Safari 浏览器打开：`http://192.168.1.100:3001`
   - 点击 Safari 顶部的 **「分享」图标 →「添加到主屏幕」**，即可拥有全屏沉浸式的《我的世界》作业应用！

3. **管理与配置**：
   - **方式 A（推荐）**：直接在 Linux 主机的 `.env` 文件中配置 `PARENT_PIN`、`OPENAI_API_KEY`、`OPENAI_BASE_URL` 等。
   - **方式 B**：在应用右上角点击 **「家长设置」**（默认密码为 `.env` 中设置的 `PARENT_PIN`，初始为 `1234`），在图形界面中修改，系统会自动双向写回 `.env` 文件持久保存。

---

## 💾 数据备份与持久化

所有数据均保存在映射的 `./data` 目录与 `./.env` 中：
- `./.env`：家长管理 PIN 码与 OpenAI 模型配置。
- `./data/state.json`：小朋友的方块背包、世界建造进度、宠物与等级。
- `./data/uploads/`：作业打卡拍摄的照片原图。

**备份数据**：
```bash
tar -czvf qiqicraft_backup_$(date +%F).tar.gz data/ .env
```

---

## 🔄 常用运维命令

- **查看运行日志**：
  ```bash
  docker compose logs -f qiqicraft
  ```
- **重启服务**：
  ```bash
  docker compose restart
  ```
- **更新到最新镜像版本**：
  ```bash
  docker compose pull
  docker compose up -d
  ```
- **停止服务**：
  ```bash
  docker compose down
  ```

---

## 🔒 进阶：配置 HTTPS（可选）

iOS Safari 调起摄像头拍照在 `http://localhost` 或本地局域网 `http://<IP>` 下通常支持文件上传拍照。如果需要外网域名或严格的 WebRTC 摄像头流，建议使用 Nginx / Caddy 反向代理并配置 SSL 证书：

### Caddy 示例 (`Caddyfile`)：
```caddy
qiqi.yourdomain.com {
    reverse_proxy localhost:3001
}
```
