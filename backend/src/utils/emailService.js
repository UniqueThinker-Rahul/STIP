const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

// Safely bind to the SystemConfig database collection dynamically
const getSystemConfigModel = () => {
  try {
    return mongoose.model('SystemConfig');
  } catch (error) {
    const SystemConfigSchema = new mongoose.Schema({
      key: { type: String, required: true, unique: true },
      value: { type: Object, required: true }
    }, { timestamps: true });
    return mongoose.model('SystemConfig', SystemConfigSchema);
  }
};

const PORTAL_BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000' || 'https://stipdash.vercel.app';

// 🚨 UPGRADE: Dynamically fetches SMTP settings from the database in real-time
const createDynamicTransporter = async () => {
  const SystemConfig = getSystemConfigModel();
  let dbConfig = null;
  
  try {
    const configDoc = await SystemConfig.findOne({ key: 'smtp_settings' });
    if (configDoc && configDoc.value) {
      dbConfig = configDoc.value;
    }
  } catch (err) {
    console.error("Dynamic SMTP Config fetch failed. Falling back to ENV:", err);
  }

  // Uses Database first, falls back to static .env if DB is empty
  const host = dbConfig?.host || process.env.SMTP_HOST || 'smtp.titan.email';
  const port = Number(dbConfig?.port) || Number(process.env.SMTP_PORT) || 465;
  const secure = dbConfig?.secure !== undefined ? dbConfig.secure : (process.env.SMTP_SECURE === 'true' || port === 465);
  const user = dbConfig?.user || process.env.SMTP_USER;
  const pass = dbConfig?.pass || process.env.SMTP_PASS;
  
  const fromName = dbConfig?.fromName || 'STIP Portal';
  const fromEmail = dbConfig?.fromEmail || user;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    family: 4 // FORCED IPv4
  });

  return {
    transporter,
    fromLine: `"${fromName}" <${fromEmail}>`
  };
};

const createHTMLTemplate = (title, recipientName, content, linkUrl) => `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #E2DDD4; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
  <div style="background-color: #0D2B55; padding: 20px; text-align: center;">
    <h2 style="color: #ffffff; margin: 0; font-size: 20px;">${title}</h2>
  </div>
  <div style="padding: 24px; color: #333333; line-height: 1.6; font-size: 14px;">
    <p style="margin-top: 0; font-size: 15px;">Dear <strong>${recipientName}</strong>,</p>
    ${content}
    <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
      <a href="${linkUrl}" style="display: inline-block; padding: 12px 24px; background-color: #C9A84C; color: #0D2B55; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; border: 1px solid #b59540;">Go To STIP Portal</a>
    </div>
  </div>
  <div style="background-color: #FAF8F4; padding: 16px; text-align: center; border-top: 1px solid #E2DDD4;">
    <p style="margin: 0; font-size: 11px; color: #6b7280;">This is an automated notification from the FSM Petroleum STIP Portal.</p>
  </div>
</div>
`;

exports.sendManagerSubmitEmail = async ({ toEmail, hrName, empName, empId, empTitle, empCompany, mgrName, quarter, year, iprfFactor, iprfLabel, submitDate }) => {
  const subject = `New STIP Appraisal Submitted — ${empName} (${quarter} ${year})`;
  const content = `
    <p>A new STIP performance appraisal has been submitted and is awaiting your review.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #FAF8F4; border-radius: 8px; overflow: hidden;">
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; width: 130px; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Employee</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; font-weight: bold;">${empName} <span style="color: #6b7280; font-weight: normal;">(ID: ${empId})</span></td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Position</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4;">${empTitle}</td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Company/Office</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4;">${empCompany}</td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Submitted by</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4;">${mgrName} (Line Manager)</td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Period</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4;">${quarter} ${year}</td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">IPRF Rating</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #1E40AF; font-weight: bold;">${iprfFactor} — ${iprfLabel}</td></tr>
      <tr><td style="padding: 10px 15px; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Submitted on</td><td style="padding: 10px 15px;">${submitDate}</td></tr>
    </table>
    <p>Please log in to the STIP Portal to review and, if appropriate, forward this appraisal to the CEO for final approval.</p>
  `;

  const { transporter, fromLine } = await createDynamicTransporter();
  return transporter.sendMail({ 
    from: fromLine, 
    to: toEmail, 
    subject, 
    html: createHTMLTemplate('New STIP Appraisal Submitted', hrName, content, `${PORTAL_BASE_URL}/dashboard/hr/appraisals`) 
  });
};

exports.sendHRForwardEmail = async ({ toEmail, ceoName, empName, empId, empTitle, empCompany, mgrName, hrName, quarter, year, iprfFactor, iprfLabel, awardPercent, forwardDate, isEP }) => {
  const subject = `STIP Appraisal Awaiting CEO Approval — ${empName} (${quarter} ${year})`;
  
  let epWarning = '';
  if (isEP) {
    epWarning = `<div style="background-color: #FFFBEB; border-left: 4px solid #D97706; padding: 12px; margin: 16px 0; color: #92400E; font-size: 13px;">
      <strong>&#9888; Exceeds Performance:</strong> This is an EP rating and includes written justification from the Line Manager. EP ratings are capped at 5% of employees.
    </div>`;
  }

  const content = `
    <p>An appraisal has been reviewed by HR and is now awaiting your approval.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #FAF8F4; border-radius: 8px; overflow: hidden;">
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; width: 130px; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Employee</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; font-weight: bold;">${empName} <span style="color: #6b7280; font-weight: normal;">(ID: ${empId})</span></td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Position</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4;">${empTitle}</td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Company/Office</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4;">${empCompany}</td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Line Manager</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4;">${mgrName}</td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Reviewed by</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4;">${hrName} (HR)</td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Period</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4;">${quarter} ${year}</td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">IPRF Rating</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #1E40AF; font-weight: bold;">${iprfFactor} — ${iprfLabel}</td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Est. Award</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #059669; font-weight: bold;">${awardPercent}% of base salary</td></tr>
      <tr><td style="padding: 10px 15px; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Forwarded on</td><td style="padding: 10px 15px;">${forwardDate}</td></tr>
    </table>
    ${epWarning}
    <p>Please log in to the STIP Portal to Approve or Not Approve this appraisal.<br/>If you select "Not Approve", a comment is required.</p>
  `;

  const { transporter, fromLine } = await createDynamicTransporter();
  return transporter.sendMail({ 
    from: fromLine, 
    to: toEmail, 
    subject, 
    html: createHTMLTemplate('STIP Appraisal Awaiting CEO Approval', ceoName, content, `${PORTAL_BASE_URL}/dashboard/ceo/approve`) 
  });
};

exports.sendCEOApproveEmail = async ({ toEmail, recipientName, empName, empId, quarter, year, iprfFactor, iprfLabel, ceoName, decisionDate }) => {
  const subject = `STIP Appraisal Approved by CEO — ${empName} (${quarter} ${year})`;
  const content = `
    <p>The CEO has <strong>APPROVED</strong> the following appraisal:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #FAF8F4; border-radius: 8px; overflow: hidden;">
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; width: 130px; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Employee</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; font-weight: bold;">${empName} <span style="color: #6b7280; font-weight: normal;">(ID: ${empId})</span></td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Period</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4;">${quarter} ${year}</td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">IPRF Rating</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #059669; font-weight: bold;">${iprfFactor} — ${iprfLabel}</td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Approved by</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4;">${ceoName} (CEO)</td></tr>
      <tr><td style="padding: 10px 15px; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Approved on</td><td style="padding: 10px 15px;">${decisionDate}</td></tr>
    </table>
    <p>This appraisal is now fully approved and ready for payroll processing.</p>
  `;

  const { transporter, fromLine } = await createDynamicTransporter();
  return transporter.sendMail({ 
    from: fromLine, 
    to: toEmail, 
    subject, 
    html: createHTMLTemplate('STIP Appraisal Approved', recipientName, content, `${PORTAL_BASE_URL}`) 
  });
};

exports.sendCEORejectEmail = async ({ toEmail, recipientName, empName, empId, quarter, year, iprfFactor, iprfLabel, ceoName, decisionDate, ceoComment, mgrName }) => {
  const subject = `STIP Appraisal Not Approved by CEO — ${empName} (${quarter} ${year})`;
  const content = `
    <p>The CEO has <strong>NOT APPROVED</strong> the following appraisal and has provided comments:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #FAF8F4; border-radius: 8px; overflow: hidden;">
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; width: 130px; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Employee</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; font-weight: bold;">${empName} <span style="color: #6b7280; font-weight: normal;">(ID: ${empId})</span></td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Period</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4;">${quarter} ${year}</td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">IPRF Rating</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #1E40AF; font-weight: bold;">${iprfFactor} — ${iprfLabel}</td></tr>
      <tr><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Reviewed by</td><td style="padding: 10px 15px; border-bottom: 1px solid #E2DDD4;">${ceoName}</td></tr>
      <tr><td style="padding: 10px 15px; color: #6b7280; font-weight: bold; font-size: 12px; text-transform: uppercase;">Decision date</td><td style="padding: 10px 15px;">${decisionDate}</td></tr>
    </table>
    
    <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 16px; margin: 20px 0; color: #991B1B;">
      <h4 style="margin-top: 0; margin-bottom: 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">CEO Comment:</h4>
      <p style="margin: 0; font-style: italic;">"${ceoComment}"</p>
    </div>

    <p><strong>Action required:</strong> Please review the comments above and follow up with the Line Manager (${mgrName}) as needed.</p>
  `;

  const { transporter, fromLine } = await createDynamicTransporter();
  return transporter.sendMail({ 
    from: fromLine, 
    to: toEmail, 
    subject, 
    html: createHTMLTemplate('STIP Appraisal Not Approved', recipientName, content, `${PORTAL_BASE_URL}`) 
  });
};