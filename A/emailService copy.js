// backend/src/utils/emailService.js
const nodemailer = require('nodemailer');
const User = require('../models/User');

// 🚨 THE FIX: Adjust the TLS handshake configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: process.env.SMTP_PORT || 587, // Usually 587 for TLS, 465 for SSL
  secure: false, // 🚨 CRITICAL FIX: Must be false for port 587 (starts plaintext, upgrades to TLS)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // Keeps it from crashing on some cloud hosting providers
    rejectUnauthorized: false 
  }
});
/**
 * 🚀 CRASH-PROOF: Dynamic Workflow Email Generator
 */
const sendAppraisalEmail = async ({ targetUserId, targetRoleContext, subject, title, bodyText, comments, actionUrl }) => {
  try {
    const user = await User.findById(targetUserId).select('personalDetails security');
    
    // 🚨 FIX: Safe Fallback for Role Context
    // If targetRoleContext is missing/undefined, default to their primary security role
    const safeRoleContext = targetRoleContext || user?.security?.role || 'EMPLOYEE';
    
    // Extract the dictionary map
    const emailsMap = user?.personalDetails?.notificationEmails;
    
    // Check for the specific role email. Fallback to primary role if needed.
    let recipientEmail = null;
    if (emailsMap && emailsMap.get(safeRoleContext)) {
      recipientEmail = emailsMap.get(safeRoleContext);
    } else if (emailsMap && emailsMap.get(user?.security?.role)) {
      recipientEmail = emailsMap.get(user.security.role);
    }

    if (!recipientEmail) {
      console.log(`✉️ Email Aborted: User ${targetUserId} has no email set for role ${safeRoleContext}.`);
      return false; // Graceful abort, no crash
    }

    // BUILD DYNAMIC COMMENTS SECTION
    let commentsHtml = '';
    if (comments && typeof comments === 'object' && Object.values(comments).some(val => val)) {
      commentsHtml = `
        <div style="background-color: #FAF8F4; border-left: 4px solid #C9A84C; padding: 16px; margin: 24px 0; border-radius: 0 6px 6px 0;">
          <p style="margin: 0 0 12px 0; font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; font-weight: bold;">
            Reviewer Notes & Justifications
          </p>
          ${comments.epJustification ? `<p style="margin: 0 0 10px 0; color: #0f1923; font-size: 14px;"><strong style="color: #0D2B55;">EP Justification:</strong><br/> <span style="font-style: italic;">"${comments.epJustification}"</span></p>` : ''}
          ${comments.manager ? `<p style="margin: 0 0 10px 0; color: #0f1923; font-size: 14px;"><strong style="color: #0D2B55;">Manager Comments:</strong><br/> <span style="font-style: italic;">"${comments.manager}"</span></p>` : ''}
          ${comments.hr ? `<p style="margin: 0 0 10px 0; color: #0f1923; font-size: 14px;"><strong style="color: #0D2B55;">HR Notes:</strong><br/> <span style="font-style: italic;">"${comments.hr}"</span></p>` : ''}
          ${comments.ceo ? `<p style="margin: 0; color: #0f1923; font-size: 14px;"><strong style="color: #0D2B55;">CEO Comments:</strong><br/> <span style="font-style: italic;">"${comments.ceo}"</span></p>` : ''}
        </div>
      `;
    }

    // Construct HTML 
    // 🚨 FIX: Safely formatting the role name for the footer string
    const formattedRoleName = typeof safeRoleContext === 'string' 
        ? safeRoleContext.replace(/_/g, ' ') 
        : 'System';

    const htmlTemplate = `
      <div style="font-family: Arial, sans-serif; max-w: 600px; margin: 0 auto; border: 1px solid #E2DDD4; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: #0D2B55; padding: 20px; text-align: center;">
          <h2 style="color: #ffffff; margin: 0; font-size: 20px; letter-spacing: 0.5px;">${title}</h2>
        </div>
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="color: #0f1923; font-size: 15px; line-height: 1.6; margin-top: 0;">
            ${bodyText}
          </p>
          
          ${commentsHtml}

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
            You are receiving this alert for your ${formattedRoleName} clearance level.
          </p>
        </div>
      </div>
    `;

    // Send the Email 
    await transporter.sendMail({
      from: `"STIP System" <${process.env.SMTP_FROM_EMAIL}>`,
      to: recipientEmail, 
      subject,
      html: htmlTemplate,
    });
    
    console.log(`✉️ Email sent successfully to ${recipientEmail} for role ${safeRoleContext}: ${subject}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to process email for User ID ${targetUserId}:`, error.message);
    return false;
  }
};

module.exports = { sendAppraisalEmail };