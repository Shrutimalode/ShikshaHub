const nodemailer = require('nodemailer');

// Create transporter for sending emails
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
};

// Enhanced welcome email template with beautiful styling
const createWelcomeEmailTemplate = (userName) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ShikshaHub!</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          min-height: 100vh;
        }
        
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 40px 30px;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        
        .header::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
          animation: float 6s ease-in-out infinite;
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        
        .logo {
          font-size: 32px;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 15px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 1;
        }
        
        h1 {
          font-size: 28px;
          font-weight: 700;
          color: #ffffff;
          margin-bottom: 10px;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          position: relative;
          z-index: 1;
        }
        
        .container {
          padding: 40px 30px;
        }
        
        p {
          font-size: 16px;
          color: #4a5568;
          margin-bottom: 20px;
          line-height: 1.8;
        }
        
        .welcome-badge {
          display: inline-block;
          background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
          color: white;
          padding: 20px 30px;
          border-radius: 50px;
          font-weight: 700;
          font-size: 18px;
          box-shadow: 0 10px 30px rgba(255, 107, 107, 0.3);
          position: relative;
          overflow: hidden;
          text-align: center;
          margin: 30px 0;
        }
        
        .welcome-badge::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
          animation: shine 3s ease-in-out infinite;
        }
        
        @keyframes shine {
          0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
          100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
        }
        
        .features {
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          padding: 30px;
          border-radius: 15px;
          margin: 25px 0;
          border: 1px solid #e2e8f0;
        }
        
        .feature-item {
          margin: 15px 0;
          padding: 15px 20px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
          border-left: 4px solid #48bb78;
          transition: transform 0.2s ease;
          font-size: 16px;
          color: #4a5568;
          font-weight: 500;
        }
        
        .feature-item:hover {
          transform: translateX(5px);
        }
        
        .cta-button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 18px 40px;
          text-decoration: none;
          border-radius: 50px;
          font-weight: 700;
          font-size: 18px;
          box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
          text-align: center;
          margin: 20px 0;
        }
        
        .cta-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
          transition: left 0.5s ease;
        }
        
        .cta-button:hover::before {
          left: 100%;
        }
        
        .hashtag {
          text-align: center;
          margin: 30px 0;
        }
        
        .hashtag-text {
          font-size: 20px;
          font-weight: 800;
          color: #667eea;
          text-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
        }
        
        .footer {
          background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%);
          color: white;
          padding: 30px;
          text-align: center;
        }
        
        .footer-content {
          margin-bottom: 20px;
        }
        
        .footer-title {
          font-size: 18px;
          font-weight: 600;
          margin-bottom: 10px;
        }
        
        .footer-text {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
        }
        
        .social-links {
          margin-top: 20px;
        }
        
        .social-link {
          display: inline-block;
          margin: 0 10px;
          color: white;
          text-decoration: none;
          font-size: 20px;
          transition: transform 0.2s ease;
        }
        
        .social-link:hover {
          transform: scale(1.2);
        }
        
        @media (max-width: 600px) {
          .email-container {
            margin: 10px;
            border-radius: 15px;
          }
          
          .header {
            padding: 30px 20px;
          }
          
          .container {
            padding: 30px 20px;
          }
          
          h1 {
            font-size: 24px;
          }
          
          .logo {
            font-size: 28px;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">ShikshaHub</div>
          <h1>Welcome to ShikshaHub! 🚀</h1>
        </div>
        
        <div class="container">
          <p>Hey ${userName},</p>
          
          <p>Welcome aboard! 🌟 We're excited to have you join our learning community.</p>
          
          <p>Here's what you can look forward to:</p>
          
          <div class="features">
            <div class="feature-item">📚 Join or request access to learning communities</div>
            <div class="feature-item">📝 Share your thoughts through blogs (with reviews & feedback)</div>
            <div class="feature-item">🔍 Quickly catch up with our blog summarization feature</div>
            <div class="feature-item">🤖 Chatbot for instant help and guidance</div>
            <div class="feature-item">📅 Stay informed about events happening in your space</div>
          </div>
          
          <div style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" class="cta-button">
              Go to My Dashboard
            </a>
          </div>
          
          <div class="hashtag">
            <div class="hashtag-text">Let's build. Let's blog. Let's grow. 🚀</div>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-content">
            <div class="footer-title">Team ShikshaHub</div>
            <div class="footer-text">
              We're excited to have you on board! If you have any questions, feel free to reach out to our support team.
            </div>
          </div>
          
          <div class="social-links">
            <a href="shikshahub112004@gmail.com" class="social-link">📧</a>
            <a href="#" class="social-link">💬</a>
            <a href="#" class="social-link">📱</a>
            <a href="#" class="social-link">🌐</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send welcome email
const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@shikshahub.com',
      to: userEmail,
      subject: 'Welcome to ShikshaHub! 🚀',
      html: createWelcomeEmailTemplate(userName)
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Welcome email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

const createResetPasswordEmailTemplate = (resetUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f7fafc; padding: 20px; }
        .email-container { max-width: 500px; margin: 0 auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 32px; }
        h2 { color: #764ba2; }
        .reset-link { display: inline-block; margin: 24px 0; padding: 12px 32px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff !important; border-radius: 8px; text-decoration: none; font-weight: bold; }
        p { color: #333; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <h2>Password Reset Request</h2>
        <p>We received a request to reset your password. Click the button below to set a new password. If you did not request this, you can safely ignore this email.</p>
        <a href="${resetUrl}" class="reset-link">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>Thanks,<br/>Team ShikshaHub</p>
      </div>
    </body>
    </html>
  `;
};

const sendResetPasswordEmail = async (userEmail, resetUrl) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@shikshahub.com',
      to: userEmail,
      subject: 'Reset Your Password - ShikshaHub',
      html: createResetPasswordEmailTemplate(resetUrl)
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
  }
};

const sendMaterialUploadEmail = async (userEmail, communityName, materialTitle) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@shikshahub.com',
      to: userEmail,
      subject: `New Material Uploaded in ${communityName} on ShikshaHub`,
      html: `<p>Hello,</p>
        <p>a new material titled <strong>${materialTitle}</strong> has been uploaded to the <strong>${communityName}</strong> community on ShikshaHub.</p>
        <p>Log in to your community to check it out and keep up with the latest resources!</p>
        <p>Happy learning,<br>Team ShikshaHub</p>`
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending material upload email:', error);
  }
};

const sendBlogUploadEmail = async (userEmail, communityName, blogTitle) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@shikshahub.com',
      to: userEmail,
      subject: `New Blog Uploaded in ${communityName}`,
      html: `<p>A new blog titled <strong>${blogTitle}</strong> has been uploaded in the community <strong>${communityName}</strong>.</p>`
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending blog upload email:', error);
  }
};

const sendBlogReviewEmail = async (userEmail, blogTitle, status) => {
  try {
    const transporter = createTransporter();
    let subject, html;
    if (status === 'approved') {
      subject = `Your Blog Was Approved!`;
      html = `🎉 Great job! Your blog titled <strong>${blogTitle}</strong> has been <strong>approved</strong> and is now live on ShikshaHub.</p><p>Keep sharing your thoughts and inspiring others with your writing.`;
    } else {
      subject = `Your Blog Was Rejected`;
      html = `<p>We appreciate your effort in submitting a blog titled <strong>${blogTitle}</strong>.</p>
<p>Unfortunately, it has been <strong>rejected</strong> during the review process. <span style="font-size:1.2em;">😔</span> Please visit ShikshaHub for detailed feedback.</p>
<p>Feel free to revise and submit again — we’d love to see it!</p>`;
    }
    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@shikshahub.com',
      to: userEmail,
      subject,
      html
    };
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending blog review email:', error);
  }
};

module.exports = {
  sendWelcomeEmail,
  createWelcomeEmailTemplate,
  sendResetPasswordEmail,
  createResetPasswordEmailTemplate,
  sendMaterialUploadEmail,
  sendBlogUploadEmail,
  sendBlogReviewEmail
};
