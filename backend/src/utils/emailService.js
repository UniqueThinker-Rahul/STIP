// backend/src/utils/emailService.js
const nodemailer = require('nodemailer');
const dns = require('dns');
const User = require('../models/User');

// 🚨 DYNAMIC PORT FIX: Prevents SSL Handshake timeouts
const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
// Port 465 requires secure: true (SSL). Port 587 requires secure: false (TLS).
const isSecure = smtpPort === 465;

// Configure the SMTP Transporter
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: isSecure, 
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  // 🚨 BULLETPROOF NETWORK FIX: Bypass Railway's OS resolver entirely.
  // dns.resolve4 queries the network directly for IPv4, guaranteeing no IPv6 timeouts.
  lookup: (hostname, options, callback) => {
    dns.resolve4(hostname, (err, addresses) => {
      if (err || !addresses || addresses.length === 0) {
        // Failsafe fallback
        return dns.lookup(hostname, { family: 4 }, callback);
      }
      // Force Nodemailer to use the raw IPv4 string (e.g. 142.250.x.x)
      callback(null, addresses[0], 4);
    });
  },
  tls: {
    rejectUnauthorized: false
  }
});

/**
 * 🚀 UPGRADED: Dynamic Workflow Email Generator (True Background Non-Blocking)
 */
const sendAppraisalEmail = async ({ targetUserId, targetRoleContext, subject, title, bodyText, comment, actionUrl }) => {
  try {
    const user = await User.findById(targetUserId).select('personalDetails security');
    
    // Extract the dictionary map
    const emailsMap = user?.personalDetails?.notificationEmails;
    
    // Check for the specific role email (e.g., HR_ADMIN). If missing, fallback to their primary role email.
    const recipientEmail = (emailsMap && emailsMap.get(targetRoleContext)) || 
                           (emailsMap && emailsMap.get(user?.security?.role));

    if (!recipientEmail) {
      console.log(`✉️ Email Aborted: User ${targetUserId} has no email set for role ${targetRoleContext}.`);
      return false;
    }

    // Construct HTML (Matching your exact design)
    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #E2DDD4; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: #0D2B55; padding: 20px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 0.5px;">${title}</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="color: #0f1923; font-size: 15px; line-height: 1.6; margin-top: 0;">
            ${bodyText}
          </p>
          ${comment ? `
            <div style="background-color: #FAF8F4; border-left: 4px solid #C9A84C; padding: 16px; margin: 24px 0; border-radius: 0 6px 6px 0;">
              <p style="margin: 0 0 6px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">
                Notes / Justification
              </p>
              <p style="margin: 0; color: #0f1923; font-size: 14px; font-style: italic; line-height: 1.5;">
                "${comment}"
              </p>
            </div>
          ` : ''}
          ${actionUrl ? `
            <div style="text-align: center; margin-top: 32px; margin-bottom: 10px;">
              <a href="${actionUrl}" style="background-color: #0D2B55; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: bold; display: inline-block;">
                View in STIP Portal
              </a>
            </div>
          ` : ''}
        </div>
        <div style="background-color: #FAF8F4; padding: 16px; text-align: center; border-top: 1px solid #E2DDD4;">
          <p style="margin: 0; color: #94a3b8; font-size: 11px;">
            This is an automated notification from the FSM Petroleum Corporation STIP System.<br/>
            You are receiving this because you opted into email alerts in your Profile Settings.
          </p>
        </div>
      </div>
    `;

    // 🚨 SEND EMAIL: Fire and Forget. Does NOT use await.
    transporter.sendMail({
      from: `"STIP System" <${process.env.SMTP_FROM_EMAIL}>`,
      to: recipientEmail, 
      subject,
      html: htmlTemplate,
    })
    .then(() => console.log(`✉️ Email sent successfully to ${recipientEmail}: ${subject}`))
    .catch(err => console.error(`❌ SMTP Failed for ${recipientEmail}:`, err.message));
    
    return true; // Instantly resolves so your frontend UI never gets stuck

  } catch (error) {
    console.error(`❌ Failed to process email for User ID ${targetUserId}:`, error.message);
    return false;
  }
};

module.exports = { sendAppraisalEmail };