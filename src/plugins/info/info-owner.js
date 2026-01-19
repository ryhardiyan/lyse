/**
 * @file Owner/creator information command handler
 * @module plugins/info/owner
 * @license Apache-2.0
 * @author Naruya Izumi
 */

/**
 * Displays owner/creator contact information as a vCard
 * @async
 * @function handler
 * @param {Object} m - Message object
 * @param {Object} conn - Connection object
 * @returns {Promise<void>}
 *
 * @description
 * Command to display the bot owner's contact information in vCard format.
 * Includes personal details, contact information, and social media links.
 *
 * @features
 * - Displays owner contact information as vCard
 * - Includes WhatsApp business profile details
 * - Shows social media links (Instagram)
 * - Contact address and business hours
 * - External advertisement integration
 * - Quoted message with forwarding context
 */

let handler = async (m, { conn }) => {
    const v = `BEGIN:VCARD
VERSION:3.0
N:;Rahardiyan;;;
FN:RyharDev 
X-WA-BIZ-NAME:MyWaSockets Luoyisse 
X-WA-BIZ-DESCRIPTION:Owner of CEO Luoyissebot
TEL;waid=6282323780821:+62 823-2378-0821
END:VCARD`;

    /*
    const q = {
        key: {
            fromMe: false,
            participant: "12066409886@s.whatsapp.net",
            remoteJid: "status@broadcast",
        },
        message: {
            contactMessage: {
                displayName: "Rahardiyan",
                vcard: v,
            },
        },
    };
    */

    const q = {
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

    await conn.sendMessage(
        m.chat,
        {
            contacts: {
                displayName: "Rahardiyan",
                contacts: [{ vcard: v }],
            },
            contextInfo: {
                externalAdReply: {
                    title: "© 2019–2026 Lyse",
                    body: "Contact via WhatsApp",
                    mediaType: 1,
                    thumbnailUrl: "https://files.catbox.moe/8tw69l.jpeg",
                    renderLargerThumbnail: true,

                    showAdAttribution: true,
                    sourceUrl: "https://wa.me/6282323780821",
                },
            },
        },
        { quoted: q }
    );
};

/**
 * Command metadata for help system
 * @property {Array<string>} help - Help text
 * @property {Array<string>} tags - Command categories
 * @property {RegExp} command - Command pattern matching
 */
handler.help = ["owner"];
handler.tags = ["info"];
handler.command = /^(owner|creator)$/i;

export default handler;
