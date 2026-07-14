const nodemailer = require('nodemailer');
const { Resend } = require('resend');

let transporter;
let resendClient;

const setupTransporter = async () => {
  // 1. Check if Resend API Key is supplied
  if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'mock_key' && process.env.RESEND_API_KEY !== '') {
    resendClient = new Resend(process.env.RESEND_API_KEY);
    console.log('[Mailer] Resend API Client initialized.');
    return;
  }

  // 2. Check if SMTP configuration is supplied
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_USER !== 'mock_user' && process.env.SMTP_USER !== '') {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log(`[Mailer] Custom SMTP Client initialized: ${process.env.SMTP_HOST}`);
    return;
  }

  // 3. Fallback: Ethereal or Console logger
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[Mailer] Development mock SMTP configured: Ethereal test account ${testAccount.user}`);
  } catch (err) {
    console.log('[Mailer] Fallback to Console Logger.');
    transporter = {
      sendMail: async (options) => {
        console.log('\n=== MOCK EMAIL SENT ===');
        console.log(`To: ${options.to}`);
        console.log(`Subject: ${options.subject}`);
        console.log(`Body:\n${options.text || options.html}`);
        console.log('=======================\n');
        return { messageId: 'console-mock-id-' + Date.now() };
      }
    };
  }
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (!resendClient && !transporter) {
    await setupTransporter();
  }

  const fromEmailAddress = process.env.MAIL_FROM || 'Creators Tutorial Arena <onboarding@resend.dev>';

  // If Resend is active, send via Resend API
  if (resendClient) {
    try {
      const response = await resendClient.emails.send({
        from: fromEmailAddress,
        to,
        subject,
        html,
        text
      });
      if (response.error) {
        throw new Error(response.error.message);
      }
      console.log(`[Mailer] Email sent via Resend API to ${to}. ID: ${response.data?.id}`);
      return response.data;
    } catch (error) {
      console.error(`[Mailer] Resend API Error sending to ${to}:`, error);
      return null;
    }
  }

  // Otherwise, send via NodeMailer (SMTP or Console)
  try {
    const info = await transporter.sendMail({
      from: fromEmailAddress,
      to,
      subject,
      text,
      html,
    });
    console.log(`[Mailer] Email sent via SMTP to ${to}. MessageID: ${info.messageId}`);
    
    // If using Ethereal preview link
    if (nodemailer.getTestMessageUrl) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`[Mailer] Preview URL: ${previewUrl}`);
      }
    }
    return info;
  } catch (error) {
    console.error(`[Mailer] NodeMailer Error sending to ${to}:`, error);
    return null;
  }
};

module.exports = { sendEmail };
