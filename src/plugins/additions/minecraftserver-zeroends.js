// plugins/tools/mcstatus.js

const LOCAL_API_BASE_URL = "http://play.zeroends.me:8081";
const LOCAL_API_KEY = "cf71431f-a9dd-4325-ae84-6dbea73f6f62";
const DEFAULT_REQUEST_TIMEOUT_MS = 8000;

// Hapus kode format Minecraft (§a, §l, dll)
function stripMinecraftFormattingCodes(text = "") {
  return String(text).replace(/§[0-9A-FK-OR]/gi, "").trim();
}

function formatJakartaDateTime(date = new Date()) {
  return date.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

function averageNumberList(nums = []) {
  if (!Array.isArray(nums) || nums.length === 0) return null;
  const sum = nums.reduce((acc, n) => acc + Number(n || 0), 0);
  return sum / nums.length;
}

async function fetchLocalApiJson(endpointPath, { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS } = {}) {
  const url = `${LOCAL_API_BASE_URL}${endpointPath}`;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": LOCAL_API_KEY,
        "Accept": "application/json",
      },
      signal: abortController.signal,
    });

    if (!res.ok) {
      return { success: false, error: `HTTP ${res.status} ${res.statusText}` };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    const message =
      err?.name === "AbortError"
        ? `Request timeout (${timeoutMs}ms)`
        : (err?.message || "Unknown error");
    return { success: false, error: message };
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildServerStatusText({ statusPayload, playersPayload }) {
  const serverMeta = statusPayload?.meta ?? {};
  const serverConfig = statusPayload?.config ?? {};
  const serverSettings = statusPayload?.settings ?? {};
  const serverPerformance = statusPayload?.performance ?? {};
  const worldInfo = statusPayload?.world ?? {};

  const motdClean = stripMinecraftFormattingCodes(serverMeta.motd || "-");

  const tpsSamples = Array.isArray(serverPerformance.tps) ? serverPerformance.tps : [];
  const tpsAverage = averageNumberList(tpsSamples);

  const onlinePlayerNames = Array.isArray(playersPayload?.list) ? playersPayload.list : [];
  const onlinePlayersText = onlinePlayerNames.length
    ? onlinePlayerNames.join(", ")
    : "No players online.";

  const checkedAt = formatJakartaDateTime();

  const maxPlayers =
    playersPayload?.max ??
    serverSettings?.max_players ??
    "-";

  const playersCount = playersPayload?.count ?? 0;

  const tpsText = tpsSamples.length
    ? `${tpsSamples.join(", ")} (avg ${tpsAverage.toFixed(2)})`
    : "-";

  return (
`*MINECRAFT SERVER STATUS*

*Status:* Online
*Software:* ${serverMeta.software ?? "-"}
*Version:* ${serverMeta.version ?? "-"}
*MOTD:* ${motdClean}
*Online Mode:* ${serverMeta.online_mode ?? "-"}

*Whitelist:* ${serverConfig.whitelist ?? "-"}
*Difficulty:* ${serverConfig.difficulty ?? "-"}
*Gamemode:* ${serverConfig.gamemode ?? "-"}
*PvP Enabled:* ${serverConfig.pvp_enabled ?? "-"}

*Players:* ${playersCount} / ${maxPlayers}
*Online Players:* ${onlinePlayersText}

*Max Players (settings):* ${serverSettings.max_players ?? "-"}
*View Distance:* ${serverSettings.view_distance ?? "-"}
*Sim Distance:* ${serverSettings.sim_distance ?? "-"}

*TPS:* ${tpsText}
*CPU Load:* ${serverPerformance.cpu_load ?? "-"}%
*RAM:* ${serverPerformance.ram_used_mb ?? "-"} MB / ${serverPerformance.ram_max_mb ?? "-"} MB

*Loaded Chunks:* ${worldInfo.loaded_chunks ?? "-"}
*Entities:* ${worldInfo.entities ?? "-"}
*Disk Free:* ${worldInfo.disk_free_gb ?? "-"} GB

*Checked At:* ${checkedAt}`
  );
}

let handler = async (m, { conn }) => {
  await global.loading?.(m, conn);

  try {
    const [statusResponse, playersResponse] = await Promise.all([
      fetchLocalApiJson("/api/status"),
      fetchLocalApiJson("/api/players"),
    ]);

    if (!statusResponse.success) throw new Error(`STATUS API: ${statusResponse.error}`);
    if (!playersResponse.success) throw new Error(`PLAYERS API: ${playersResponse.error}`);

    const statusPayload = statusResponse.data ?? {};
    const playersPayload = playersResponse.data ?? {};

    const text = buildServerStatusText({ statusPayload, playersPayload });
    await conn.sendMessage(m.chat, { text }, { quoted: m });

  } catch (err) {
    conn.logger?.error?.(err);

    const checkedAt = formatJakartaDateTime();
    await m.reply(
`*MINECRAFT SERVER STATUS*

*Status:* Offline / API Unreachable
*Checked At:* ${checkedAt}
• Error: ${err.message}`
    );
  } finally {
    await global.loading?.(m, conn, true);
  }
};

handler.command = /^(zeroends)$/i;
export default handler;