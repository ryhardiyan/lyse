const API_BASE = "http://play.zeroends.me:8081";
const API_KEY = "cf71431f-a9dd-4325-ae84-6dbea73f6f62";

const NL = String.fromCharCode(10);

function splitText(text, maxLen = 3500) {
  const out = [];
  for (let i = 0; i < text.length; i += maxLen) out.push(text.slice(i, i + maxLen));
  return out;
}

async function postConsole(command, { timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}/api/console`, {
      method: "POST",
      headers: {
        "X-API-Key": API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ command }),
      signal: controller.signal,
    });

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status} ${res.statusText}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (e) {
    const msg =
      e && e.name === "AbortError"
        ? `Request timeout (${timeoutMs}ms)`
        : (e && e.message) ? e.message : "Unknown error";
    return { success: false, error: msg };
  } finally {
    clearTimeout(t);
  }
}

function box(title, lines) {
  // ASCII-only biar aman dari masalah encoding
  const top = "┌" + "─".repeat(34) + "┐";
  const mid = "├" + "─".repeat(34) + "┤";
  const bot = "└" + "─".repeat(34) + "┘";

  const t = `│ ${String(title).slice(0, 32).padEnd(32, " ")} │`;
  const body = (lines || [])
    .map(s => `│ ${String(s).slice(0, 32).padEnd(32, " ")} │`)
    .join(NL);

  return [top, t, mid, body, bot].filter(Boolean).join(NL);
}

let handler = async (m, { conn, text }) => {
  await global.loading?.(m, conn);

  try {
    const cmd = (text || "").trim();
    if (!cmd) {
      const help =
        `EVAL CONSOLE${NL}${NL}` +
        `Usage:${NL}` +
        `/eval <command>${NL}${NL}` +
        `Example:${NL}` +
        `/eval execute at Kaiitens run summon lightning_bolt ~ ~ ~`;
      await conn.sendMessage(m.chat, { text: help }, { quoted: m });
      return;
    }

    // Optional: amankan command kepanjangan biar gak spam
    if (cmd.length > 500) throw new Error("Command terlalu panjang (max 500 karakter).");

    const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    const result = await postConsole(cmd);
    if (!result.success) throw new Error(result.error || "Gagal execute console.");

    const data = result.data || {};
    const ok = data.success === true;

    const header = ok ? "EXECUTED" : "FAILED";
    const statusLine = ok ? "Status: OK" : "Status: NOT OK";

    const msg =
      box("MINECRAFT CONSOLE /EVAL", [
        `Time: ${now}`,
        statusLine,
        `API: ${data.status ?? "-"}`,
      ]) +
      NL + NL +
      `Command:` + NL +
      `${data.command ?? cmd}` + NL + NL +
      `Result:` + NL +
      `- status: ${String(data.status ?? "-")}` + NL +
      `- success: ${String(data.success ?? false)}`;

    for (const part of splitText(msg, 3500)) {
      await conn.sendMessage(m.chat, { text: part }, { quoted: m });
    }
  } catch (e) {
    conn.logger?.error?.(e);
    await m.reply(`EVAL ERROR${NL}Error: ${e.message}`);
  } finally {
    await global.loading?.(m, conn, true);
  }
};

handler.command = /^(eval)$/i;

// SANGAT disarankan owner-only, karena ini bisa execute command server
handler.owner = true;

export default handler;