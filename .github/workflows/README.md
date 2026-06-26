# 机场自动签到（69云 / SSPanel）

用 GitHub Actions 每天自动签到领流量。无需服务器、无需额外依赖。

## 使用方法

1. **建仓**：把本仓库的 `checkin.js` 和 `.github/workflows/checkin.yml` 放进你自己的仓库（公开/私有都行）。
2. **设置 Secrets**：仓库 → **Settings → Secrets and variables → Actions → New repository secret**，添加：

   | 名称 | 值 | 必填 |
   |---|---|---|
   | `DOMAIN` | `https://69yun69.com` | 是 |
   | `EMAIL` | 登录邮箱 | 是（除非用 `COOKIE`） |
   | `PASSWORD` | 登录密码 | 是（除非用 `COOKIE`） |
   | `COOKIE` | 浏览器登录后的 Cookie（兜底用） | 否 |
   | `TG_TOKEN` / `TG_ID` | Telegram 通知 | 否 |
   | `BARK_URL` | Bark 推送（iOS） | 否 |

3. **手动测一次**：仓库 → **Actions** 标签 → 左侧选「机场自动签到」→ **Run workflow**。点开这次运行看日志，能直接看到签到结果或失败原因。
4. **定时**：工作流已带每日 cron（北京时间 0:10 和 9:10），无需额外配置。

## 注意

- **GitHub 的「定时陷阱」**：如果仓库连续 60 天没有任何提交，GitHub 会自动**停用**定时工作流（并发邮件提醒），到时点一下重新启用、或随便提交一次即可。
- 若日志出现「登录返回的不是 JSON」，多半是登录被验证码/盾拦截或域名变了：先确认 `DOMAIN` 是当前能打开的；仍不行就用 `COOKIE` 方案（浏览器登录后从开发者工具 Network 复制 Cookie 填进 Secret，脚本会跳过账号密码登录）。

## 免责声明

仅供学习与个人账号自用，请遵守所在地区法律法规。
