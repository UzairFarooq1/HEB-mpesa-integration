require("dotenv").config();

const express = require("express");
const multer = require("multer");
const uuid = require("uuid");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const {
  generateTicketPdf,
  saveTicketPdf,
} = require("../services/ticketPdfService");
const { createTransporter, getFromAddress } = require("../services/mailerService");

const app = express();

function parseAllowedOrigins() {
  const configured = process.env.ALLOWED_ORIGINS;
  if (configured) {
    return configured
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  return [
    "https://ticketing.halaleventbrite.co.ke",
    "https://halaleventbrite.co.ke",
    "http://localhost:3000",
    "http://localhost:5173",
  ];
}

const allowedOrigins = parseAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Origin not allowed"));
    },
  }),
);

app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60000),
    max: Number(process.env.RATE_LIMIT_MAX || 50),
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage });
const transporter = createTransporter();

function validateApiKey(req, res, next) {
  const expectedApiKey = process.env.MAILER_API_KEY;
  if (!expectedApiKey) return next();

  const providedApiKey = req.get("x-api-key");
  if (providedApiKey !== expectedApiKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  return next();
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

app.post("/send-email", validateApiKey, upload.none(), async (req, res) => {
  try {
    const {
      email,
      phone_number,
      type,
      full_name,
      gender,
      amount,
      eventDesc,
      ticketId,
      mpesaReceipt,
    } = req.body;

    if (!email || !full_name) {
      return res.status(400).json({
        error: "Missing required fields: email and full_name are required",
      });
    }

    const ticketFor = eventDesc || "Event";
    const finalTicketId = ticketId || uuid.v4();
    const ticket = {
      email,
      phone_number,
      type,
      full_name,
      gender,
      amount,
      eventDesc: ticketFor,
      ticketId: finalTicketId,
      mpesaReceipt,
    };

    const pdfBuffer = await generateTicketPdf(ticket);
    const { storagePath, ticketUrl } = await saveTicketPdf(
      finalTicketId,
      pdfBuffer,
    );

    const safeName = escapeHtml(full_name);
    const safeTicketFor = escapeHtml(ticketFor);
    const safeType = escapeHtml(type || "N/A");
    const safeAmount = escapeHtml(amount || "0.00");
    const safeReceipt = escapeHtml(mpesaReceipt || "N/A");
    const safeTicketId = escapeHtml(finalTicketId);
    const downloadHtml = ticketUrl
      ? `<p>You can also download your ticket here: <a href="${escapeHtml(ticketUrl)}">Download ticket PDF</a></p>`
      : "";

    await transporter.sendMail({
      from: getFromAddress(),
      to: email,
      subject: `Your Ticket Confirmation - ${ticketFor}`,
      text: `Dear ${full_name},

Thank you for your purchase. Your ticket for "${ticketFor}" has been confirmed.

Ticket Details:
- Ticket Type: ${type || "N/A"}
- Amount: Ksh ${amount || "0.00"}
- Mpesa Receipt: ${mpesaReceipt || "N/A"}
- Ticket ID: ${finalTicketId}
${ticketUrl ? `\nDownload ticket: ${ticketUrl}\n` : ""}
Best regards,
Halal EventBrite Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Ticket Confirmation</h2>
          <p>Dear ${safeName},</p>
          <p>Thank you for your purchase. Your ticket for <strong>${safeTicketFor}</strong> has been confirmed.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Ticket Details:</h3>
            <p><strong>Ticket Type:</strong> ${safeType}</p>
            <p><strong>Amount:</strong> Ksh ${safeAmount}</p>
            <p><strong>Mpesa Receipt:</strong> ${safeReceipt}</p>
            <p><strong>Ticket ID:</strong> ${safeTicketId}</p>
          </div>
          <p>Your ticket PDF is attached to this email.</p>
          ${downloadHtml}
          <p>Best regards,<br>Halal EventBrite Team</p>
        </div>
      `,
      attachments: [
        {
          filename: `${finalTicketId}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    });

    res.status(200).json({
      success: true,
      message: "Email sent successfully",
      ticketId: finalTicketId,
      ticketPdfPath: storagePath,
      ticketUrl,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).json({
      error: "Error sending email",
      message:
        process.env.NODE_ENV === "production"
          ? "Failed to send ticket email"
          : error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;
