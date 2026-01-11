// Require necessary modules
require("dotenv").config();
const express = require("express");
const multer = require("multer");
const nodemailer = require("nodemailer");
const { PDFDocument } = require("pdf-lib");
const QRCode = require("qrcode");
const uuid = require("uuid"); // Import uuid for generating unique IDs
const fs = require("fs"); // Import fs for file system operations
const cors = require("cors");

// Create an Express app
const app = express();

// Use the cors middleware
app.use(cors());

// Parse incoming JSON request bodies
app.use(express.json());

// Set up Multer for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Create Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_ADDRESS,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Define route for sending emails with attachments
app.post("/send-email", upload.none(), async (req, res) => {
  try {
    // Extract data from request body
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

    // Validate required fields
    if (!email || !full_name) {
      return res.status(400).json({
        error: "Missing required fields: email and full_name are required",
      });
    }

    // Use eventDesc from request, fallback to default
    const ticketFor = eventDesc || "Event";

    // Use ticketId from request if provided, otherwise generate one
    const finalTicketId = ticketId || uuid.v4();

    // Generate QR code from ticket data and ID
    const qrCodeData = JSON.stringify({
      full_name,
      phone_number,
      type,
      ticketId: finalTicketId,
      gender,
    });
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);

    // Generate PDF attachment
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage();

    // Try to add PNG logo if it exists (optional, won't fail if missing)
    try {
      const logoPath = "../server/heblogo.png";
      if (fs.existsSync(logoPath)) {
        const logoImageBytes = fs.readFileSync(logoPath);
        const logoImage = await pdfDoc.embedPng(logoImageBytes);
        const logoDims = 100;
        page.drawImage(logoImage, {
          x: page.getWidth() * 0.2, // Moved left by 20%
          y: page.getHeight() * 0.7, // Moved up by 70%
          width: logoDims,
          height: logoDims,
        });
      }
    } catch (logoError) {
      console.warn(
        "Logo not found or could not be loaded, continuing without logo:",
        logoError.message
      );
    }
    // Add ticket details
    const textX = page.getWidth() * 0.2; // Moved left by 20%
    let textY = page.getHeight() * 0.5; // Moved down by 50%

    // Add ticket details
    page.drawText(`Ticket for ${full_name}`, {
      x: textX,
      y: textY + 100,
      size: 18,
      align: "center",
    });
    page.drawText(`Ticket Type: ${type || "N/A"}`, {
      x: textX,
      y: textY + 70,
      size: 14,
      align: "center",
    });
    page.drawText(`Amount: Ksh ${amount || "0.00"}`, {
      x: textX,
      y: textY + 40,
      size: 14,
      align: "center",
    });
    page.drawText(`Mpesa Receipt: ${mpesaReceipt || "N/A"}`, {
      x: textX,
      y: textY + 10,
      size: 14,
      align: "center",
    });
    page.drawText(`Event: ${ticketFor}`, {
      x: textX,
      y: textY - 5,
      size: 14,
      align: "center",
    });
    if (gender) {
      page.drawText(`Gender: ${gender}`, {
        x: textX + 150,
        y: textY + 70,
        size: 14,
        align: "center",
      });
    }

    // Add QR code in the center
    const qrDims = 200;
    const qrX = (page.getWidth() - qrDims) / 2;
    const qrY = textY - 220; // Pushed up by 120 units
    const qrCodeImageBuffer = Buffer.from(
      qrCodeImage.replace(/^data:image\/\w+;base64,/, ""),
      "base64"
    );
    page.drawImage(await pdfDoc.embedPng(qrCodeImageBuffer), {
      x: qrX,
      y: qrY,
      width: qrDims,
      height: qrDims,
    });

    // Add ticket ID underneath the QR code
    page.drawText(`Ticket ID: ${finalTicketId}`, {
      x: qrX,
      y: qrY - 20,
      size: 12,
    });

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save();

    // Create email options
    const mailOptions = {
      from: process.env.EMAIL_ADDRESS,
      to: email,
      subject: `Your Ticket Confirmation - ${ticketFor}`,
      text: `Dear ${full_name},\n\nThank you for your purchase. Your ticket for "${ticketFor}" has been confirmed.\n\nTicket Details:\n- Ticket Type: ${
        type || "N/A"
      }\n- Amount: Ksh ${amount || "0.00"}\n- Mpesa Receipt: ${
        mpesaReceipt || "N/A"
      }\n- Ticket ID: ${finalTicketId}\n\nBest regards,\nHalal EventBrite Team`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Ticket Confirmation</h2>
          <p>Dear ${full_name},</p>
          <p>Thank you for your purchase. Your ticket for <strong>${ticketFor}</strong> has been confirmed.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Ticket Details:</h3>
            <p><strong>Ticket Type:</strong> ${type || "N/A"}</p>
            <p><strong>Amount:</strong> Ksh ${amount || "0.00"}</p>
            <p><strong>Mpesa Receipt:</strong> ${mpesaReceipt || "N/A"}</p>
            <p><strong>Ticket ID:</strong> ${finalTicketId}</p>
          </div>
          <p>Your ticket PDF is attached to this email.</p>
          <p>Best regards,<br>Halal EventBrite Team</p>
        </div>
      `,
      attachments: [
        {
          filename: "ticket_confirmation.pdf",
          content: pdfBytes,
          encoding: "base64",
        },
      ],
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Send a success response
    res.status(200).json({
      success: true,
      message: "Email sent successfully",
      ticketId: finalTicketId,
    });
  } catch (error) {
    console.error("Error sending email:", error);
    // Send detailed error message for debugging
    res.status(500).json({
      error: "Error sending email",
      message: error.message,
      details: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Export the app instance
module.exports = app;
