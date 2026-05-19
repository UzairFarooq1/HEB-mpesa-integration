const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const { PDFDocument } = require("pdf-lib");
const QRCode = require("qrcode");

function initializeFirebaseAdmin() {
  if (admin.apps.length) return admin.app();

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET || "halaleventbrite.appspot.com";

  if (serviceAccountJson || serviceAccountBase64) {
    const rawServiceAccount =
      serviceAccountJson ||
      Buffer.from(serviceAccountBase64, "base64").toString("utf8");

    return admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(rawServiceAccount)),
      projectId: process.env.FIREBASE_PROJECT_ID || "halaleventbrite",
      storageBucket,
    });
  }

  return admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || "halaleventbrite",
    storageBucket,
  });
}

function getStorageBucket() {
  initializeFirebaseAdmin();
  return admin.storage().bucket();
}

async function generateTicketPdf(ticket) {
  const {
    full_name,
    phone_number,
    type,
    ticketId,
    gender,
    amount,
    eventDesc,
    mpesaReceipt,
  } = ticket;
  const ticketFor = eventDesc || "Event";

  const qrCodeData = JSON.stringify({
    full_name,
    phone_number,
    type,
    ticketId,
    gender,
  });
  const qrCodeImage = await QRCode.toDataURL(qrCodeData);

  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();

  try {
    const logoPath = path.join(__dirname, "..", "heblogo.png");
    if (fs.existsSync(logoPath)) {
      const logoImageBytes = fs.readFileSync(logoPath);
      const logoImage = await pdfDoc.embedPng(logoImageBytes);
      page.drawImage(logoImage, {
        x: page.getWidth() * 0.2,
        y: page.getHeight() * 0.7,
        width: 100,
        height: 100,
      });
    }
  } catch (logoError) {
    console.warn(
      "Logo not found or could not be loaded, continuing without logo:",
      logoError.message,
    );
  }

  const textX = page.getWidth() * 0.2;
  const textY = page.getHeight() * 0.5;

  page.drawText(`Ticket for ${full_name}`, {
    x: textX,
    y: textY + 100,
    size: 18,
  });
  page.drawText(`Ticket Type: ${type || "N/A"}`, {
    x: textX,
    y: textY + 70,
    size: 14,
  });
  page.drawText(`Amount: Ksh ${amount || "0.00"}`, {
    x: textX,
    y: textY + 40,
    size: 14,
  });
  page.drawText(`Mpesa Receipt: ${mpesaReceipt || "N/A"}`, {
    x: textX,
    y: textY + 10,
    size: 14,
  });
  page.drawText(`Event: ${ticketFor}`, {
    x: textX,
    y: textY - 5,
    size: 14,
  });
  if (gender) {
    page.drawText(`Gender: ${gender}`, {
      x: textX + 150,
      y: textY + 70,
      size: 14,
    });
  }

  const qrDims = 200;
  const qrX = (page.getWidth() - qrDims) / 2;
  const qrY = textY - 220;
  const qrCodeImageBuffer = Buffer.from(
    qrCodeImage.replace(/^data:image\/\w+;base64,/, ""),
    "base64",
  );

  page.drawImage(await pdfDoc.embedPng(qrCodeImageBuffer), {
    x: qrX,
    y: qrY,
    width: qrDims,
    height: qrDims,
  });

  page.drawText(`Ticket ID: ${ticketId}`, {
    x: qrX,
    y: qrY - 20,
    size: 12,
  });

  return Buffer.from(await pdfDoc.save());
}

async function saveTicketPdf(ticketId, pdfBuffer) {
  const storagePath = `tickets/${ticketId}.pdf`;
  const file = getStorageBucket().file(storagePath);

  await file.save(pdfBuffer, {
    contentType: "application/pdf",
    metadata: {
      cacheControl: "private, max-age=0, no-transform",
    },
  });

  let ticketUrl = null;
  try {
    const [signedUrl] = await file.getSignedUrl({
      action: "read",
      expires: Date.now() + 1000 * 60 * 60 * 24 * 30,
    });
    ticketUrl = signedUrl;
  } catch (error) {
    console.warn("Ticket PDF saved but signed URL generation failed:", error);
  }

  return { storagePath, ticketUrl };
}

module.exports = {
  generateTicketPdf,
  saveTicketPdf,
};
