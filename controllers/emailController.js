// ---------------------------------------------------------
// Email Controller - Handles all email sending functionality
// Uses Resend for email delivery
// ---------------------------------------------------------

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ---------------------------------------------------------
// Send Password Reset Email
// ---------------------------------------------------------
async function sendPasswordResetEmail(userEmail, resetToken) {
  try {
    const fromEmail = process.env.FROM_EMAIL || 'onboarding@resend.dev';
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const resetUrl = `${baseUrl}/reset-password/${resetToken}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { 
              display: inline-block; 
              padding: 12px 24px; 
              background-color: #007bff; 
              color: white; 
              text-decoration: none; 
              border-radius: 4px; 
              margin: 20px 0;
            }
            .footer { font-size: 12px; color: #666; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>Password Reset Request</h2>
            <p>You requested to reset your password for your CMS account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="${resetUrl}" class="button">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p>${resetUrl}</p>
            <p><strong>This link will expire in 1 hour.</strong></p>
            <p>If you did not request a password reset, please ignore this email.</p>
            <div class="footer">
              <p>This is an automated message from the CMS system.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Password Reset Request

You requested to reset your password for your CMS account.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you did not request a password reset, please ignore this email.
    `;

    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: userEmail,
      subject: 'Password Reset Request',
      html: htmlContent,
      text: textContent
    });

    if (error) {
      console.error('❌ Resend error:', error);
      throw new Error(`Failed to send email: ${error.message}`);
    }

    console.log('✅ Password reset email sent:', { to: userEmail, emailId: data?.id });
    return { success: true, emailId: data?.id };

  } catch (err) {
    console.error('❌ Error sending password reset email:', err);
    throw err;
  }
}

// ---------------------------------------------------------
// Send Welcome/Verification Email (future use)
// ---------------------------------------------------------
async function sendWelcomeEmail(userEmail, verificationToken) {
  // Placeholder for future email verification functionality
  console.log('📧 Welcome email not yet implemented');
  return { success: false, message: 'Not implemented' };
}

module.exports = {
  sendPasswordResetEmail,
  sendWelcomeEmail
};
