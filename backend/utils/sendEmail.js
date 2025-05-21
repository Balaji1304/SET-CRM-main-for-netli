const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const NodeCache = require('node-cache');

// Cache for compiled email templates (30 mins expiry)
const emailTemplateCache = new NodeCache({ stdTTL: 1800 });

// Create a reusable transporter object (created once)
const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  },
  socketTimeout: 30000
});

const sendEmail = async (options) => {
  try {
    let compiledTemplate;
    const cacheKey = `email_${options.template}`;
    const isDevelopment = process.env.NODE_ENV === 'development';

    // Try to get compiled template from cache (unless in development)
    if (!isDevelopment) {
      compiledTemplate = emailTemplateCache.get(cacheKey);
    }

    if (!compiledTemplate) {
      const templatePath = path.join(__dirname, `../templates/${options.template}.handlebars`);
      const source = fs.readFileSync(templatePath, 'utf-8');
      
      // Compile template
      compiledTemplate = handlebars.compile(source);
      if (!isDevelopment) {
        emailTemplateCache.set(cacheKey, compiledTemplate);
      }
    }

    const html = compiledTemplate(options.data);

    // Send email
    const message = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      html,
      attachments: options.attachments,
      priority: 'high'
    };

    return await transporter.sendMail(message);
  } catch (error) {
    throw new Error('Email could not be sent');
  }
};

module.exports = sendEmail; 