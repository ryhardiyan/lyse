import { sticker } from "#lib/sticker.js";

const handler = async (m, { conn, text, usedPrefix, command }) => {
  const commandPattern = new RegExp(`^\\${usedPrefix}${command}\\b\\s*`, "i");

  const usageMessage = () =>
    `Text is required.\nExample: ${usedPrefix}${command} Hello Ness`;

  try {
    const sourceText = (m.quoted?.text || text || "").trim();
    const qcText = sourceText.replace(commandPattern, "").trim();

    if (!qcText) return m.reply(usageMessage());

    const displayName = (await m.quoted?.name) || m.pushName || (await m.name) || "Anonymous";

    const targetJid = m.quoted?.sender || m.sender;

    const profilePictureUrl = await conn
      .profilePictureUrl(targetJid, "image")
      .catch(() => null);

    if (!profilePictureUrl) {
      return m.reply("Cannot create QC: your WhatsApp profile picture is empty or hidden. Please set a profile picture (or allow access), then try again.");
    }

    await global.loading(m, conn);
    
    const apiBaseUrl = "https://api.nexray.web.id/maker/qc";
    const params = new URLSearchParams({
      text: qcText,
      name: displayName,
      avatar: profilePictureUrl,
      color: "Putih",
    });

    const apiUrl = `${apiBaseUrl}?${params.toString()}`;

    const apiResponse = await fetch(apiUrl);
    if (!apiResponse.ok) {
      throw new Error(
        `QC API error: ${apiResponse.status} ${apiResponse.statusText}`
      );
    }

    const qcImageBuffer = Buffer.from(await apiResponse.arrayBuffer());

    const stickerBuffer = await sticker(qcImageBuffer, {
      packName: global.config.stickpack || "",
      authorName: global.config.stickauth || "",
    });

    await conn.sendMessage(m.chat, { sticker: stickerBuffer }, { quoted: m });
  } catch (err) {
    conn.logger?.error?.(err);
    return m.reply(`QC failed. ${err?.message || "Unknown error"}`);
  } finally {
    await global.loading(m, conn, true);
  }
};

handler.help = ["qc"];
handler.tags = ["maker"];
handler.command = /^(qc)$/i;

export default handler;