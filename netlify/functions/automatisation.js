// netlify/functions/automatisation.js
// Utilise Groq (gratuit) et Brevo

exports.handler = async function(event, context) {

    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Méthode non autorisée" }) };
    }

    try {
        const prospect = JSON.parse(event.body);
        const { nom, email, telephone } = prospect;

        if (!nom || !email) {
            return { statusCode: 400, body: JSON.stringify({ error: "Nom et email requis" }) };
        }

        // ─────────────────────────────────────────
        // ÉTAPE 1 : Message personnalisé via Groq
        // ─────────────────────────────────────────
        const aiPrompt = `Tu es un conseiller en assurance belge, chaleureux et professionnel.
Écris une phrase d'introduction personnalisée (2 phrases max, ton humain et bienveillant) 
pour un email adressé à ${nom}, qui vient de s'inscrire pour recevoir un guide sur 
la protection financière et la prévoyance. 
La phrase doit être directe, sans "Cher/Chère", commencer par son prénom.`;

        let messageIA = `${nom.split(' ')[0]}, merci pour votre inscription. Votre guide est prêt à être consulté.`;

        try {
            const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    max_tokens: 120,
                    messages: [{ role: "user", content: aiPrompt }]
                })
            });

            const groqData = await groqResponse.json();
            messageIA = groqData.choices?.[0]?.message?.content || messageIA;
        } catch (aiError) {
            console.warn("Groq indisponible, message par défaut utilisé:", aiError.message);
        }

        // ─────────────────────────────────────────
        // ÉTAPE 2 : Envoi du guide au PROSPECT via Brevo
        // ─────────────────────────────────────────
        const guideUrl = process.env.GUIDE_URL;

        const emailHtmlProspect = `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Votre guide 2026</title>
</head>
<body style="margin:0;padding:0;background:#f4f1eb;font-family:'Segoe UI',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1eb;padding:40px 0;">
  <tr>
    <td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 2px 20px rgba(0,0,0,0.08);">
        
        <tr>
          <td style="background:#0f1f3d;padding:48px 48px 40px;">
            <p style="font-family:Georgia,serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;margin:0 0 24px 0;">Cabinet Conseil Assurance</p>
            <h1 style="font-family:Georgia,serif;font-weight:300;font-size:32px;color:#ffffff;margin:0;line-height:1.25;">
              Votre guide <em style="color:#c9a84c;">2026</em> est prêt
            </h1>
          </td>
        </tr>

        <tr>
          <td style="padding:48px;">
            <p style="font-size:16px;color:#1a1a2e;line-height:1.7;margin:0 0 24px 0;">
              ${messageIA}
            </p>
            <p style="font-size:15px;color:#5a5248;line-height:1.7;margin:0 0 32px 0;">
              Ce guide complet couvre les domaines essentiels pour sécuriser votre avenir financier en Belgique.
            </p>

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;">
              <tr>
                <td align="center">
                  <a href="${guideUrl}" 
                     style="display:inline-block;background:#0f1f3d;color:#ffffff;font-family:'Segoe UI',Arial,sans-serif;font-size:13px;font-weight:500;letter-spacing:2px;text-transform:uppercase;text-decoration:none;padding:18px 48px;border-radius:2px;">
                    Consulter le guide →
                  </a>
                </td>
              </tr>
            </table>

            <p style="font-size:14px;color:#5a5248;line-height:1.7;margin:0 0 24px 0;">
              Des questions sur votre situation personnelle ? Répondez directement à cet email.
            </p>
            <p style="font-size:15px;color:#1a1a2e;margin:0;">
              Bien à vous,<br>
              <strong style="font-family:Georgia,serif;font-weight:400;color:#0f1f3d;">Votre Conseiller</strong>
            </p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

        const brevoProspectResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "api-key": process.env.BREVO_API_KEY
            },
            body: JSON.stringify({
                sender: {
                    name: process.env.SENDER_NAME || "Votre Conseiller",
                    email: process.env.SENDER_EMAIL
                },
                to: [{ email: email, name: nom }],
                subject: `${nom.split(' ')[0]}, votre guide pratique 2026 est prêt`,
                htmlContent: emailHtmlProspect
            })
        });

        if (!brevoProspectResponse.ok) {
            throw new Error("Erreur lors de l'envoi de l'email au prospect");
        }

        // ─────────────────────────────────────────
        // ÉTAPE 3 : Alerte à TOI (Le Conseiller) via Brevo
        // ─────────────────────────────────────────
        
        await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "api-key": process.env.BREVO_API_KEY
            },
            body: JSON.stringify({
                sender: { 
                    name: "Bot d'Acquisition", 
                    email: process.env.SENDER_EMAIL 
                },
                // On s'envoie l'email à soi-même (SENDER_EMAIL)
                to: [{ email: process.env.SENDER_EMAIL, name: process.env.SENDER_NAME || "Moi" }],
                subject: `🚨 NOUVEAU PROSPECT : ${nom}`,
                htmlContent: `
                    <div style="font-family: sans-serif; padding: 20px; background: #f3f4f6;">
                        <h2 style="color: #0f1f3d;">Nouveau téléchargement du guide !</h2>
                        <div style="background: white; padding: 20px; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <p><strong>Nom :</strong> ${nom}</p>
                            <p><strong>Email :</strong> <a href="mailto:${email}">${email}</a></p>
                            <p><strong>GSM :</strong> <a href="tel:${telephone || ''}">${telephone || "Non renseigné"}</a></p>
                        </div>
                        <p style="font-size: 12px; color: #666; margin-top: 20px;">
                            Pense à ajouter ce contact dans ton téléphone. Tu peux cliquer directement sur le numéro pour l'appeler.
                        </p>
                    </div>
                `
            })
        });

        // Confirmation finale au site web
        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ success: true })
        };

    } catch (error) {
        console.error("Erreur handler:", error);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Erreur interne. Veuillez réessayer." })
        };
    }
};
