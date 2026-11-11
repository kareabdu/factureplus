// Signature mail partagée pour les emails automatisés de StockTracker.
// Deux formats : texte brut (pour SendEmail en plain text) et HTML.

export const EMAIL_SIGNATURE_TEXT = `
Cordialement,
L'équipe StockTracker
📞 +221 77 833 97 71
✉️ applikare@gmail.com
🌐 invoice.kareapps.com`;

export const EMAIL_SIGNATURE_HTML = `
    <tr>
      <td style="padding-top: 28px; border-top: 1px solid #2a2a2a;">
        <p style="margin: 0 0 6px; color: #ffffff; font-size: 14px;">Cordialement,</p>
        <p style="margin: 0 0 14px; color: #ffffff; font-size: 15px; font-weight: 600;">L'équipe StockTracker</p>
        <p style="margin: 0 0 4px; color: #b0b0b0; font-size: 13px;">📞 +221 77 833 97 71</p>
        <p style="margin: 0 0 4px; color: #b0b0b0; font-size: 13px;">✉️ <a href="mailto:applikare@gmail.com" style="color: #d0bfff; text-decoration: none;">applikare@gmail.com</a></p>
        <p style="margin: 0; color: #b0b0b0; font-size: 13px;">🌐 <a href="https://invoice.kareapps.com" style="color: #339af0; text-decoration: none;">invoice.kareapps.com</a></p>
      </td>
    </tr>`;