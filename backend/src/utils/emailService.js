const nodemailer = require('nodemailer');

// 🚨 UPGRADE: Configured with your specific Mailtrap Sandbox Credentials
const transporter = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "32b9ccf8c7a194",
    pass: "c09a45d350794b"
  }
});

/**
 * 🚀 UPGRADED: Dynamic Workflow Email Generator
 * Automatically formats STIP notifications with a professional HTML template,
 * injecting dynamic comments (like EP justifications or CEO rejections) and action buttons.
 */
const sendAppraisalEmail = async ({ to, subject, title, bodyText, comment, actionUrl }) => {
  try {
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
            Please do not reply directly to this email.
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"STIP System" <notifications@fsmpc.fm>`,
      to,
      subject,
      html: htmlTemplate,
    });
    
    console.log(`✉️ Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`❌ Failed to send email to ${to}:`, error.message);
    return false;
  }
};

module.exports = { sendAppraisalEmail };