const nodemailer = require('nodemailer');

// Configure the SMTP connection
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.mailtrap.io', // Fallback for dev testing
  port: process.env.SMTP_PORT || 2525,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// A decoupled background function to send workflow emails
const sendWorkflowEmail = async (to, subject, htmlContent) => {
  try {
    await transporter.sendMail({
      from: `"STIP System" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlContent,
    });
    console.log(`✉️ Email sent to ${to}: ${subject}`);
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
  }
};

module.exports = { sendWorkflowEmail };