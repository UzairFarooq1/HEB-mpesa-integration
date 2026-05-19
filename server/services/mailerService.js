const nodemailer = require("nodemailer");

function parseBoolean(value, fallback = false) {
  if (value == null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: parseBoolean(process.env.SMTP_SECURE, true),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
}

function getFromAddress() {
  return process.env.SMTP_FROM || process.env.SMTP_USER;
}

module.exports = {
  createTransporter,
  getFromAddress,
};
