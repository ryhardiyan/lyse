// plugins/tools/mcstatus.js

const MCSTATUS_API_BASE_URL = "https://api.mcstatus.io/v2";
const MC_SERVER_ADDRESS = "play.dhaaserver.my.id:25573";
const DEFAULT_REQUEST_TIMEOUT_MS = 8000;

function formatJakartaDateTime(epochMs) {
  if (!epochMs && epochMs !== 0) return "-";
  return new Date(epochMs).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

function formatBoolean(value) {
  if (value === true) return "Yes";
  if (value === false) return "No";
  return "-";
}

function formatMaybe(value, fallback = "-") {
  return value === null || value === undefined || value === "" ? fallback : String(value);
}

function getSrvRecordText(srvRecord) {
  if (!srvRecord?.host || !srvRecord?.port) return "None";
  return `${srvRecord.host}:${srvRecord.port}`;
}

function getOnlinePlayerNames(players) {
  const list = Array.isArray(players?.list) ? players.list : [];
  const names = list.map(p => p?.name_clean).filter(Boolean);
  return names;
}

function buildMcStatusWidgetUrl(address) {
  return `${MCSTATUS_API_BASE_URL}/widget/java/${address}`;
}

function buildMcStatusApiUrl(address) {
  return `${MCSTATUS_API_BASE_URL}/status/java/${address}`;
}

async function fetchMcStatusJson(address, { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS } = {}) {
  const url = buildMcStatusApiUrl(address);

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: abortController.signal,
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      return {
        success: false,
        error: errorText || `HTTP ${res.status} ${res.statusText}`,
      };
    }

    const data = await res.json();
    return { success: true, data };
  } catch (err) {
    const message =
      err?.name === "AbortError"
        ? `Request timeout (${timeoutMs}ms)`
        : (err?.message || "Unknown error occurred.");
    return { success: false, error: message };
  } finally {
    clearTimeout(timeoutId);
  }
}

function buildServerStatusCaption(statusPayload) {
  const isOnline = Boolean(statusPayload?.online);

  const host = formatMaybe(statusPayload?.host);
  const port = formatMaybe(statusPayload?.port);
  const ipAddress = formatMaybe(statusPayload?.ip_address);
  const eulaBlocked = formatBoolean(statusPayload?.eula_blocked);

  const srvRecordText = getSrvRecordText(statusPayload?.srv_record);

  const versionNameClean = formatMaybe(statusPayload?.version?.name_clean, "Unknown");
  const motdClean = formatMaybe(statusPayload?.motd?.clean);

  const playersOnline = statusPayload?.players?.online ?? 0;
  const playersMax = statusPayload?.players?.max ?? 0;

  const onlinePlayerNames = getOnlinePlayerNames(statusPayload?.players);
  const onlinePlayersText = onlinePlayerNames.length
    ? onlinePlayerNames.join(", ")
    : "No players online.";

  const retrievedAtText = formatJakartaDateTime(statusPayload?.retrieved_at);
  const expiresAtText = formatJakartaDateTime(statusPayload?.expires_at);

  const title = "MINECRAFT SERVER STATUS";
  const statusLine = isOnline ? "Online" : "Offline";

  // Catatan: saat offline, fields seperti version/players/motd bisa missing,
  // jadi semua akses sudah dibuat aman (fallback "-"/"Unknown"/0).
  if (isOnline) {
    return (
`*${title}*

*Status:* ${statusLine}
*Host:* ${host}
*Port:* ${port}
*IP Address:* ${ipAddress}
*EULA Blocked:* ${eulaBlocked}
*SRV Record:* ${srvRecordText}

*Version:* ${versionNameClean}
*MOTD:* ${motdClean}

*Players:* ${playersOnline} / ${playersMax}
*Online Players:* ${onlinePlayersText}

*Retrieved At:* ${retrievedAtText}
*Expires At:* ${expiresAtText}`
    );
  }

  return (
`*${title}*

*Status:* ${statusLine}
*Host:* ${host}
*Port:* ${port}
*IP Address:* ${ipAddress}
*EULA Blocked:* ${eulaBlocked}
*SRV Record:* ${srvRecordText}

*MOTD:* ${motdClean}

*Retrieved At:* ${retrievedAtText}
*Expires At:* ${expiresAtText}

_The server is currently offline or unreachable._`
  );
}

let handler = async (m, { conn }) => {
  await global.loading?.(m, conn);

  try {
    const statusResponse = await fetchMcStatusJson(MC_SERVER_ADDRESS);
    if (!statusResponse.success) throw new Error(statusResponse.error || "Failed to fetch server status.");

    const statusPayload = statusResponse.data ?? {};
    const widgetUrl = buildMcStatusWidgetUrl(MC_SERVER_ADDRESS);
    const caption = buildServerStatusCaption(statusPayload);

    await conn.sendMessage(
      m.chat,
      {
        image: { url: widgetUrl },
        caption,
      },
      { quoted: m }
    );
  } catch (err) {
    conn.logger?.error?.(err);
    await m.reply(
`Failed to check server status.
• Error: ${err.message}`
    );
  } finally {
    await global.loading?.(m, conn, true);
  }
};

handler.command = /^(dhaaserver)$/i;
export default handler;