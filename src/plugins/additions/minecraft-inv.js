// plugins/owner/inv.js
// Command: /inv <player>

const API_BASE = "http://play.zeroends.me:8081";
const API_KEY = "cf71431f-a9dd-4325-ae84-6dbea73f6f62";

// newline aman (hindari masalah copy-paste yang bikin ".join(" lalu enter)
const NL = String.fromCharCode(10);

function splitText(text, maxLen = 3500) {
  const out = [];
  for (let i = 0; i < text.length; i += maxLen) out.push(text.slice(i, i + maxLen));
  return out;
}

function toTitleCaseFromEnum(s = "") {
  // DIAMOND_PICKAXE -> Diamond Pickaxe
  return String(s)
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map(w => (w[0] ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
}

async function fetchLocal(path, { timeoutMs = 8000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "GET",
      headers: {
        "X-API-Key": API_KEY,
        "Accept": "application/json",
      },
      signal: controller.signal,
    });

    if (!res.ok) return { success: false, error: `HTTP ${res.status} ${res.statusText}` };

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

function mergeInventory(list = []) {
  const merged = list.reduce((acc, cur) => {
    const key = cur && cur.item;
    const amt = Number(cur && cur.amount != null ? cur.amount : 0) || 0;
    if (!key) return acc;
    acc.set(key, (acc.get(key) || 0) + amt);
    return acc;
  }, new Map());

  return [...merged.entries()].map(([item, amount]) => ({ item, amount }));
}

const TOOL_KEYS = [
  "PICKAXE",
  "AXE",
  "SHOVEL",
  "HOE",
  "SWORD",
  "BOW",
  "CROSSBOW",
  "TRIDENT",
  "FISHING_ROD",
  "SHEARS",
  "FLINT_AND_STEEL",
  "SHIELD",
];

function isToolItem(item = "") {
  const s = String(item);
  return TOOL_KEYS.some(k => s.includes(k));
}

function formatMergedLines(arr = []) {
  if (!arr.length) return "- (none)";
  return arr
    .sort((a, b) => String(a.item).localeCompare(String(b.item)))
    .map(x => `- ${toTitleCaseFromEnum(x.item)} x${x.amount}`)
    .join(NL); // penting: newline pemisah
}

let handler = async (m, { conn, text }) => {
  await global.loading?.(m, conn);

  try {
    const player = (text || "").trim();
    if (!player) throw new Error("Usage: /inv <player>");

    const qPlayer = encodeURIComponent(player);
    const invRes = await fetchLocal(`/api/inventory?player=${qPlayer}`);

    if (!invRes.success) throw new Error(invRes.error || "Failed to fetch inventory");

    const payload = invRes.data || {};
    const now = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

    // API kadang balikin { error: ... } walau HTTP 200
    if (payload.error) {
      const msg =
        `*INVENTORY*${NL}${NL}` +
        `✦ *Player:* ${player}${NL}` +
        `✦ *Checked At:* ${now}${NL}${NL}` +
        `*Status:* ${payload.error}${NL}`;
      await conn.sendMessage(m.chat, { text: msg }, { quoted: m });
      return;
    }

    const armorArr = Array.isArray(payload.armor) ? payload.armor : [];
    const armorSet = new Set(armorArr.map(String));

    const invArr = Array.isArray(payload.inventory) ? payload.inventory : [];
    const mergedAll = mergeInventory(invArr);

    // Biar armor tidak dobel tampil di items/tools
    const mergedNoArmor = mergedAll.filter(x => !armorSet.has(String(x.item)));

    const toolsMerged = mergedNoArmor.filter(x => isToolItem(x.item));
    const itemsMerged = mergedNoArmor.filter(x => !isToolItem(x.item));

    const armorLines = armorArr.length
      ? armorArr.map(a => `- ${toTitleCaseFromEnum(a)}`).join(NL)
      : "- (none)";

    const toolLines = formatMergedLines(toolsMerged);
    const itemLines = formatMergedLines(itemsMerged);

    const caption =
      `*INVENTORY*${NL}${NL}` +
      `✦ *Player:* ${payload.player || player}${NL}` +
      `✦ *Checked At:* ${now}${NL}${NL}` +
      `*Armor:*${NL}` +
      `${armorLines}${NL}${NL}` +
      `*Tools:*${NL}` +
      `${toolLines}${NL}${NL}` +
      `*Items:*${NL}` +
      `${itemLines}${NL}${NL}` +
      `*────────── ✦  ✦ ──────────*`;

    for (const part of splitText(caption, 3500)) {
      await conn.sendMessage(m.chat, { text: part }, { quoted: m });
    }
  } catch (e) {
    conn.logger?.error?.(e);
    await m.reply(`Failed.${NL}Error: ${e.message}`);
  } finally {
    await global.loading?.(m, conn, true);
  }
};

handler.command = /^(inv)$/i;
export default handler;