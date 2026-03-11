# Image Wizard 部署说明（Caddy + Docker Compose）

本目录用于部署 `demo/image-wizard`，默认域名示例为 `wizard.linzhiqing.dev`。

## 文件说明

- `Dockerfile`：构建并运行 Next.js 应用（3099）。
- `docker-compose.yml`：编排 `wizard-app` + `caddy`。
- `Caddyfile`：自动 HTTPS，`/` 重定向到 `/wizard`。
- `.env.example`：部署环境变量模板。

## 首次部署

```bash
cd demo/image-wizard/deploy
cp .env.example .env
```

编辑 `.env`：

```env
DOMAIN=wizard.linzhiqing.dev
TZ=Asia/Shanghai

XINGJIABI_API_KEY=your_key
XINGJIABI_BASE_URL=https://xingjiabiapi.org
XINGJIABI_MODEL_ID=gemini-2.5-flash-image
XINGJIABI_TIMEOUT_MS=120000
```

启动：

```bash
docker compose config
docker compose up -d --build
```

## 验收

```bash
docker compose ps
curl -I https://wizard.linzhiqing.dev/
curl -I https://wizard.linzhiqing.dev/wizard
```

预期：
- `/` 返回 `308` 并跳转 `/wizard`
- `/wizard` 返回 `200`

接口快速验收：

```bash
curl -sS https://wizard.linzhiqing.dev/api/generate \
  -H "Content-Type: application/json" \
  -d '{"template_id":"demo","selections":{},"prompt":"hello","meta":{"ratio":"1:1","image_count":1}}'
```

## 日常更新

```bash
cd demo/image-wizard/deploy
docker compose up -d --build
```

查看日志：

```bash
docker compose logs -f caddy
docker compose logs -f wizard-app
```
