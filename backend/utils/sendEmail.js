const nodemailer = require('nodemailer');
const handlebars = require('handlebars');
const fs = require('fs');
const path = require('path');
const NodeCache = require('node-cache');

// Cache for compiled email templates (30 mins expiry)
const emailTemplateCache = new NodeCache({ stdTTL: 1800 });

const sendEmail = async (options) => {
  try {
    // Create a reusable transporter object using SMTP connection pool
    const transporter = nodemailer.createTransport({
      pool: true,
      maxConnections: 10,
      maxMessages: Infinity,
      rateDelta: 1000,
      rateLimit: 5,
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3',
        secureProtocol: 'TLSv1_method'
      },
      socketTimeout: 60000
    });

    // Verify connection configuration
    transporter.verify(function(error, success) {
      if (error) {
        console.log('SMTP connection error:', error);
      } else {
        console.log("SMTP server is ready to take our messages");
      }
    });

    let compiledTemplate;
    const cacheKey = `email_${options.template}`;

    // Try to get compiled template from cache
    compiledTemplate = emailTemplateCache.get(cacheKey);

    if (!compiledTemplate) {
      const templatePath = path.join(__dirname, `../templates/${options.template}.handlebars`);
      const source = fs.readFileSync(templatePath, 'utf-8');
      
      // Compile template
      compiledTemplate = handlebars.compile(source);
      emailTemplateCache.set(cacheKey, compiledTemplate);
    }

    const html = compiledTemplate(options.data);

    // Optimize attachments
    if (options.attachments) {
      options.attachments = options.attachments.map(attachment => ({
        ...attachment,
        encoding: 'base64'
      }));
    }

    // Send email
    const message = {
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: options.email,
      subject: options.subject,
      html,
      attachments: options.attachments,
      priority: 'high',
      disableFileAccess: true,
      disableUrlAccess: true
    };

    return new Promise((resolve, reject) => {
      transporter.sendMail(message, (error, info) => {
        if (error) {
          reject(error);
        } else {
          resolve(info);
        }
      });
    });
  } catch (error) {
    throw new Error('Email could not be sent: ' + error.message);
  }
};

module.exports = sendEmail; 