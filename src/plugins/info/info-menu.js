import os from "os";

const CATS = ["ai", "downloader", "group", "info", "internet", "maker", "owner", "tools"];

const META = {
    ai: "AI",
    downloader: "Downloader",
    group: "Group",
    info: "Info",
    internet: "Internet",
    maker: "Maker",
    owner: "Owner",
    tools: "Tools",
};

let handler = async (m, { conn, usedPrefix, command, args }) => {
    await global.loading(m, conn);

    try {
        const pkg = await getPkg();
        const help = getHelp();
        const inp = (args[0] || "").toLowerCase();
        const time = new Date().toTimeString().split(" ")[0];

        if (inp === "all") {
            return await all(conn, m, help, usedPrefix, time);
        }

        if (!inp) {
            return await main(conn, m, pkg, usedPrefix, command, time);
        }

        const idx = parseInt(inp) - 1;
        const cat = !isNaN(idx) && CATS[idx] ? CATS[idx] : inp;

        if (!CATS.includes(cat)) {
            return m.reply(`Invalid category. Use \`${usedPrefix + command}\``);
        }

        return await show(conn, m, help, cat, usedPrefix, time);
    } catch (e) {
        m.reply(`Error: ${e.message}`);
    } finally {
        await global.loading(m, conn, true);
    }
};

async function all(conn, m, help, prefix, time) {
    const cmds = CATS.map((c) => {
        const list = format(help, c, prefix);
        return list.length > 0 ? `\n${META[c]}\n${list.join("\n")}` : "";
    })
        .filter(Boolean)
        .join("\n");

    const txt = ["```", `[${time}] All Commands`, "─".repeat(25), cmds, "```"].join("\n");

    return conn.sendMessage(
        m.chat,
        {
            text: txt,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                externalAdReply: {
                    title: "All Commands",
                    body: "Complete List",
                    thumbnailUrl: "https://qu.ax/TLqUB.png",
                    sourceUrl: "https://diyan.greyrat.me/",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: await q() }
    );
}

async function main(conn, m, pkg, prefix, cmd, time) {
    const upBot = fmt(process.uptime());
    const upSys = fmt(os.uptime());

    const cap = [
        "```",
        `[${time}] Liora`,
        "─".repeat(25),
        `Name    : ${pkg.name}`,
        `Version : ${pkg.version}`,
        `License : ${pkg.license}`,
        `Type    : ${pkg.type}`,
        `Runtime : Bun ${Bun.version}`,
        `VPS Up  : ${upSys}`,
        `Bot Up  : ${upBot}`,
        "",
        `Owner   : ${pkg.author?.name || "Rahardiyan"}`,
        `Social  : https://diyan.greyrat.me/`,
        "─".repeat(25),
        "Select category below",
        "```",
    ].join("\n");

    const sections = [
        {
            title: "Categories",
            highlight_label: "ナルヤ イズミ",
            rows: CATS.map((c) => ({
                title: META[c],
                description: `View ${META[c]} commands`,
                id: `${prefix + cmd} ${c}`,
            })),
        },
        {
            title: "Options",
            highlight_label: "ナルヤ イズミ",
            rows: [
                {
                    title: "All Commands",
                    description: "View all at once",
                    id: `${prefix + cmd} all`,
                },
            ],
        },
    ];

    return await conn.client(
        m.chat,
        {
            product: {
                productImage: { url: "https://files.catbox.moe/1moinz.jpg" },
                productId: "9471827079564958",
                title: "Lyse Menu",
                description: "WhatsApp Bot",
                currencyCode: "USD",
                priceAmount1000: 1000000000000000,
                retailerId: global.config.author,
                url: "https://wa.me/p/9471827079564958/6282323780821",
                productImageCount: 1,
            },
            businessOwnerJid: "26594823413973@lid",
            caption: "*© Rahardiyan 2019 - 2026*",
            title: "Lyse Menu",
            footer: cap,
            interactiveButtons: [
                {
                    name: "single_select",
                    buttonParamsJson: JSON.stringify({
                        title: "Select",
                        sections,
                    }),
                },
                {
                    name: "cta_url",
                    buttonParamsJson: JSON.stringify({
                        display_text: "Website",
                        url: "https://diyan.greyrat.me/",
                    }),
                },
            ],
            hasMediaAttachment: false,
        },
        { quoted: await q() }
    );
}

async function show(conn, m, help, cat, prefix, time) {
    const cmds = format(help, cat, prefix);

    const txt =
        cmds.length > 0
            ? [
                  "```",
                  `[${time}] ${META[cat]} Commands`,
                  "─".repeat(25),
                  cmds.join("\n"),
                  "─".repeat(25),
                  `Total: ${cmds.length}`,
                  "```",
              ].join("\n")
            : `No commands for ${META[cat]}`;

    return conn.sendMessage(
        m.chat,
        {
            text: txt,
            contextInfo: {
                forwardingScore: 999,
                isForwarded: true,
                externalAdReply: {
                    title: `${META[cat]} Commands`,
                    body: `${cmds.length} commands`,
                    thumbnailUrl: "https://qu.ax/TLqUB.png",
                    sourceUrl: "https://diyan.greyrat.me/",
                    mediaType: 1,
                    renderLargerThumbnail: true,
                },
            },
        },
        { quoted: await q() }
    );
}

handler.help = ["menu"];
handler.tags = ["info"];
handler.command = /^(menu|help)$/i;

export default handler;

function fmt(sec) {
    const m = Math.floor(sec / 60);
    const h = Math.floor(m / 60);
    const d = Math.floor(h / 24);
    return (
        [d && `${d}d`, h % 24 && `${h % 24}h`, m % 60 && `${m % 60}m`].filter(Boolean).join(" ") ||
        "0m"
    );
}

function getPkg() {
    try {
        return Bun.file("./package.json").json();
    } catch {
        return {
            name: "Unknown",
            version: "?",
            type: "?",
            license: "?",
            author: { name: "Unknown" },
        };
    }
}

function getHelp() {
    return Object.values(global.plugins)
        .filter((p) => !p.disabled)
        .map((p) => ({
            help: [].concat(p.help || []),
            tags: [].concat(p.tags || []),
            owner: p.owner,
            mods: p.mods,
            admin: p.admin,
        }));
}

function format(help, cat, prefix) {
    return help
        .filter((p) => p.tags.includes(cat))
        .flatMap((p) =>
            p.help.map((cmd) => {
                const b = p.mods ? " (dev)" : p.owner ? " (owner)" : p.admin ? " (admin)" : "";
                return `- ${prefix + cmd}${b}`;
            })
        );
}

async function q() {
    return {
        key: {
            fromMe: false,
            participant: "26594823413973@lid",
            remoteJid: "status@broadcast",
        },
        message: {
            interactiveMessage: {
                nativeFlowMessage: {
                    buttons: {
                        0: {
                            name: "payment_info",
                            buttonParamsJson: JSON.stringify({
                                currency: "IDR",
                                total_amount: {
                                    value: 999999999999999,
                                    offset: 0,
                                },
                                reference_id: "RYHARDEV",
                                type: "physical-goods",
                                order: {
                                    status: "pending",
                                    subtotal: {
                                        value: 999999999999999,
                                        offset: 0,
                                    },
                                    order_type: "ORDER",
                                    items: [
                                        {
                                            name: "Rahardiyan",
                                            amount: {
                                                value: 999999999999999,
                                                offset: 0,
                                            },
                                            quantity: 1,
                                            sale_amount: {
                                                value: 999999999999999,
                                                offset: 0,
                                            },
                                        },
                                    ],
                                },
                                payment_settings: [
                                    {
                                        type: "pix_static_code",
                                        pix_static_code: {
                                            merchant_name: "RyharPedia",
                                            key: "MyWaSockets Luoyisse",
                                            key_type: "EVP",
                                        },
                                    },
                                ],
                                share_payment_status: false,
                            }),
                        },
                        length: 1,
                    },
                },
            },
        },
        participant: "26594823413973@lid",
    };
}
