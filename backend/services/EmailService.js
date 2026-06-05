/**
 * Email Service
 * Sends transactional emails (order confirmations, notifications, etc.)
 * 
 * Setup:
 * 1. Install nodemailer: npm install nodemailer
 * 2. Enable 2FA on Gmail account
 * 3. Generate App Password: https://myaccount.google.com/apppasswords
 * 4. Set EMAIL_USER and EMAIL_PASSWORD in .env
 */

import nodemailer from 'nodemailer';

export class EmailService {
  constructor(emailUser, emailPassword, merchantEmail) {
    this.emailUser = emailUser;
    this.emailPassword = emailPassword;
    this.merchantEmail = merchantEmail || emailUser;
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword,
      },
    });
  }

  /**
   * Send order confirmation to merchant
   */
  async sendOrderConfirmation(order) {
    if (!this.emailUser || !this.emailPassword) {
      console.warn('Email service not configured - skipping order confirmation');
      return null;
    }

    const itemsHtml = order.items
      .map(
        (item) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">
            ${item.name}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
            ${item.quantity}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">
            ${item.size || 'N/A'}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
            ${(item.price * item.quantity).toLocaleString('fr-FR')} XOF
          </td>
        </tr>
      `
      )
      .join('');

    const paymentLabel = {
      wave: 'Wave',
      moov: 'Moov Money',
      mtn: 'MTN Money',
      orange: 'Orange Money',
    }[order.paymentMethod] || order.paymentMethod;

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="color: #C5A059;">🛍️ Nouvelle Commande - ${order.orderNumber}</h2>
            
            <div style="background: #F9EAE1; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Détails du Client</h3>
              <p><strong>Nom:</strong> ${order.customer.name}</p>
              <p><strong>Téléphone:</strong> ${order.customer.phone}</p>
              <p><strong>Adresse:</strong> ${order.customer.address}</p>
            </div>

            <h3>Articles Commandés</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: #C5A059; color: white;">
                  <th style="padding: 10px; text-align: left;">Article</th>
                  <th style="padding: 10px; text-align: center;">Quantité</th>
                  <th style="padding: 10px; text-align: center;">Taille</th>
                  <th style="padding: 10px; text-align: right;">Prix</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
              <p style="margin: 5px 0;">
                <strong>Sous-total:</strong> ${(order.subtotal || 0).toLocaleString('fr-FR')} XOF
              </p>
              <p style="margin: 5px 0;">
                <strong>Frais de livraison:</strong> ${(order.shipping || 0).toLocaleString('fr-FR')} XOF
              </p>
              <p style="margin: 5px 0; font-size: 18px; color: #C5A059;">
                <strong>Total: ${order.total.toLocaleString('fr-FR')} XOF</strong>
              </p>
            </div>

            <div style="margin-top: 20px; padding: 15px; background: #e8f4f8; border-left: 4px solid #1a3d5c;">
              <h4>Méthode de Paiement</h4>
              <p>📱 ${paymentLabel}</p>
              <p><strong>Statut:</strong> ${order.status}</p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; color: #666; font-size: 12px;">
              <p>© 2026 Noor Al Hayaa - Boutique de mode modeste</p>
              <p style="margin: 5px 0;">Contact: ${process.env.MERCHANT_PHONE || '221700000000'}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: this.emailUser,
        to: this.merchantEmail,
        subject: `[NOUVELLE COMMANDE] ${order.orderNumber} - ${order.customer.name}`,
        html: htmlContent,
      });

      console.log(`✅ Order confirmation email sent: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error('❌ Failed to send order confirmation email:', error.message);
      return null;
    }
  }

  /**
   * Send payment received notification
   */
  async sendPaymentConfirmation(order) {
    if (!this.emailUser || !this.emailPassword) return null;

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d6e3a;">✅ Paiement Reçu - ${order.orderNumber}</h2>
            <p>Le paiement de <strong>${order.total.toLocaleString('fr-FR')} XOF</strong> a été confirmé.</p>
            <p>La commande sera expédiée bientôt.</p>
            <p style="margin-top: 30px; color: #666; font-size: 12px;">
              © 2026 Noor Al Hayaa
            </p>
          </div>
        </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: this.emailUser,
        to: this.merchantEmail,
        subject: `[PAIEMENT CONFIRMÉ] ${order.orderNumber}`,
        html: htmlContent,
      });
    } catch (error) {
      console.error('Failed to send payment confirmation:', error.message);
    }
  }

  /**
   * Send shipment notification
   */
  async sendShipmentNotification(order, trackingInfo) {
    if (!this.emailUser || !this.emailPassword) return null;

    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; color: #333;">
          <div style="max-width: 600px; margin: 0 auto;">
            <h2 style="color: #C5A059;">📦 Votre Colis est en Expédition - ${order.orderNumber}</h2>
            <p>Bonjour ${order.customer.name},</p>
            <p>Votre commande a été expédiée!</p>
            ${
              trackingInfo
                ? `
              <div style="background: #F9EAE1; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <p><strong>Numéro de suivi:</strong> ${trackingInfo.number}</p>
                <p><strong>Transporteur:</strong> ${trackingInfo.carrier}</p>
                <p><a href="${trackingInfo.url}" style="color: #C5A059; text-decoration: none;">Suivre votre colis</a></p>
              </div>
            `
                : ''
            }
            <p>Merci de votre achat!</p>
          </div>
        </body>
      </html>
    `;

    try {
      await this.transporter.sendMail({
        from: this.emailUser,
        to: this.merchantEmail,
        subject: `[EXPÉDITION] ${order.orderNumber} - En route vers vous`,
        html: htmlContent,
      });
    } catch (error) {
      console.error('Failed to send shipment notification:', error.message);
    }
  }

  /**
   * Test email connection
   */
  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email service connected');
      return true;
    } catch (error) {
      console.error('❌ Email service error:', error.message);
      return false;
    }
  }
}

export default EmailService;
