import nodemailer from "nodemailer";

const FROM_EMAIL = "info@blackrockrestaurantng.com";
const FROM_NAME  = "BLACKROCK Restaurant & Lounge";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const appPassword = process.env.ZOHO_APP_PASSWORD;
    if (!appPassword) {
      return res.status(500).json({ error: "Server misconfiguration: missing ZOHO_APP_PASSWORD" });
    }

    const { to, subject, body } = req.body ?? {};
    if (!to)      return res.status(400).json({ error: "Recipient email (to) is required" });
    if (!subject) return res.status(400).json({ error: "Subject is required" });
    if (!body)    return res.status(400).json({ error: "Body is required" });

    const transporter = nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      auth: {
        user: FROM_EMAIL,
        pass: appPassword,
      },
    });

    // Convert plain text line breaks to HTML
    const htmlBody = body
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");

    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject,
      text: body,
      html: `
        <div style="font-family: Georgia, serif; font-size: 15px; color: #1a1a1a; line-height: 1.7; max-width: 600px;">
          ${htmlBody}
        </div>
        <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e5e5; font-family: sans-serif; font-size: 11px; color: #888;">
          BLACKROCK Restaurant &amp; Lounge · 11 Ajao Road, off Adeniyi Jones Road, Ikeja, Lagos
        </div>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("[send-email] error:", err);
    return res.status(500).json({ error: err?.message || "Failed to send email" });
  }
}
