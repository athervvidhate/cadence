const twilio = require("twilio");
const nodemailer = require("nodemailer");
const env = require("../config/env");

function hasTwilio() {
  return env.twilioAccountSid && env.twilioAuthToken && env.twilioFromNumber;
}

function hasSmtp() {
  return env.smtpHost && env.smtpUser && env.smtpPass;
}

async function sendSms(to, body) {
  if (!hasTwilio()) {
    return { type: "sms_caregiver", to, status: "mocked" };
  }
  const client = twilio(env.twilioAccountSid, env.twilioAuthToken);
  await client.messages.create({ to, from: env.twilioFromNumber, body });
  return { type: "sms_caregiver", to, status: "sent" };
}

async function sendEmail(to, subject, text) {
  if (!hasSmtp()) {
    return { type: "email_caregiver", to, status: "mocked" };
  }
  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: false,
    auth: { user: env.smtpUser, pass: env.smtpPass },
  });
  await transporter.sendMail({ from: env.fromEmail, to, subject, text });
  return { type: "email_caregiver", to, status: "sent" };
}

module.exports = { sendSms, sendEmail };
