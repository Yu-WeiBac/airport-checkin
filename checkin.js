// checkin.js — 机场自动签到（SSPanel 通用，已适配 69云 / 69yun69）
// 运行环境：GitHub Actions（Node 20+，自带 fetch 与 Headers.getSetCookie，无需额外依赖）
//
// 需要的 Secrets（仓库 Settings → Secrets and variables → Actions）：
//   DOMAIN      机场域名，例：https://69yun69.com        （必填）
//   EMAIL       登录邮箱（兼容写成 USERNAME）            （必填，除非用 COOKIE）
//   PASSWORD    登录密码                                 （必填，除非用 COOKIE）
//   COOKIE      （可选）浏览器登录后的 Cookie，填了就跳过账号密码登录
//   TG_TOKEN / TG_ID    （可选）Telegram 通知
//   BARK_URL            （可选）Bark 推送（iOS）

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36";

function normalizeDomain(d) {
  if (!d) return "";
  d = d.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//.test(d)) d = "https://" + d;
  return d;
}

function snippet(s, n = 200) {
  if (!s) return "(空)";
  s = s.replace(/\s+/g, " ").trim();
  return s.length > n ? s.slice(0, n) + "…" : s;
}

async function login(cfg) {
  const resp = await fetch(`${cfg.domain}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      Accept: "application/json, text/plain, */*",
      Origin: cfg.domain,
      Referer: `${cfg.domain}/auth/login`,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: JSON.stringify({
      email: cfg.email,
      passwd: cfg.password,
      code: "",
      remember_me: "on",
    }),
  });

  const raw = await resp.text();
  if (!resp.ok) throw new Error(`登录 HTTP ${resp.status}：${snippet(raw)}`);

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`登录返回的不是 JSON（多半被 CF 盾 / 验证码拦截，或域名不对）：${snippet(raw)}`);
  }
  if (data.ret !== 1) throw new Error(`登录被拒：${data.msg || "未知原因"}`);

  let cookies = [];
  if (typeof resp.headers.getSetCookie === "function") {
    cookies = resp.headers.getSetCookie();
  } else {
    const h = resp.headers.get("set-cookie");
    if (h) cookies = [h];
  }
  const cookie = cookies.map((c) => c.split(";")[0]).filter(Boolean).join("; ");
  if (!cookie) throw new Error("登录成功但没拿到 Cookie");
  return cookie;
}

async function checkin(cfg, cookie) {
  const resp = await fetch(`${cfg.domain}/user/checkin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": UA,
      Accept: "application/json, text/plain, */*",
      Origin: cfg.domain,
      Referer: `${cfg.domain}/user`,
      Cookie: cookie,
      "X-Requested-With": "XMLHttpRequest",
    },
  });

  const raw = await resp.text();
  if (!resp.ok) throw new Error(`签到 HTTP ${resp.status}：${snippet(raw)}`);

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`签到返回的不是 JSON（Cookie 可能已失效）：${snippet(raw)}`);
  }

  // SSPanel：ret=1 成功；ret=0 一般是「今天已签到」；其它为真失败
  if (data.ret === 1) return `🎉 签到成功\n${data.msg || "完成"}`;
  if (data.ret === 0) return `ℹ️ 今日已签到\n${data.msg || ""}`;
  throw new Error(`签到被拒：${data.msg || "未知原因"}`);
}

async function notify(cfg, msg) {
  const time = new Date(Date.now() + 8 * 3600 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  const body = `【69云签到】\n${time}\n${msg}`;

  if (cfg.tgToken && cfg.tgId) {
    try {
      await fetch(`https://api.telegram.org/bot${cfg.tgToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: cfg.tgId, text: body }),
      });
    } catch (e) {
      console.error("TG 推送异常:", e.message);
    }
  }

  if (cfg.barkUrl) {
    try {
      const base = cfg.barkUrl.replace(/\/+$/, "");
      await fetch(`${base}/${encodeURIComponent("69云签到")}/${encodeURIComponent(msg)}`);
    } catch (e) {
      console.error("Bark 推送异常:", e.message);
    }
  }
}

async function main() {
  const cfg = {
    domain: normalizeDomain(process.env.DOMAIN),
    email: process.env.EMAIL || process.env.USERNAME,
    password: process.env.PASSWORD,
    cookie: process.env.COOKIE,
    tgToken: process.env.TG_TOKEN,
    tgId: process.env.TG_ID,
    barkUrl: process.env.BARK_URL,
  };

  const missing = [];
  if (!cfg.domain) missing.push("DOMAIN");
  if (!cfg.cookie) {
    if (!cfg.email) missing.push("EMAIL");
    if (!cfg.password) missing.push("PASSWORD");
  }
  if (missing.length) {
    const m = `❌ 缺少 Secrets：${missing.join(", ")}`;
    console.error(m);
    await notify(cfg, m);
    process.exit(1);
  }

  try {
    const cookie = cfg.cookie || (await login(cfg));
    const result = await checkin(cfg, cookie);
    console.log(result);
    await notify(cfg, result);
  } catch (err) {
    const m = `❌ 签到失败：${err.message}`;
    console.error(m);
    await notify(cfg, m);
    process.exit(1); // 让这次 Actions 显示为失败，方便你在邮件/页面看到
  }
}

main();
