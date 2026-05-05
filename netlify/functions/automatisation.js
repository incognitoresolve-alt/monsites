// netlify/functions/automatisation.js
// Utilise Groq (gratuit) à la place d'OpenAI

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
        // ÉTAPE 1 : Message personnalisé via Groq (GRATUIT)
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
            // Si Groq échoue, on continue avec le message par défaut
            console.warn("Groq indisponible, message par défaut utilisé:", aiError.message);
        }

        // ─────────────────────────────────────────
        // ÉTAPE 2 : Envoi de l'email via Brevo
        // ─────────────────────────────────────────
        const guideUrl = process.env.GUIDE_URL;

        const emailHtml = `
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
        
        <!-- HEADER -->
        <tr>
          <td style="background:#0f1f3d;padding:48px 48px 40px;">
            <p style="font-family:Georgia,serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:#c9a84c;margin:0 0 24px 0;">Cabinet Conseil Assurance</p>
            <h1 style="font-family:Georgia,serif;font-weight:300;font-size:32px;color:#ffffff;margin:0;line-height:1.25;">
              Votre guide <em style="color:#c9a84c;">2026</em> est prêt
            </h1>
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:48px;">
            
            <p style="font-size:16px;color:#1a1a2e;line-height:1.7;margin:0 0 24px 0;">
              ${messageIA}
            </p>

            <p style="font-size:15px;color:#5a5248;line-height:1.7;margin:0 0 32px 0;">
              Ce guide complet couvre les 5 domaines essentiels pour sécuriser votre avenir financier en Belgique :
            </p>

            <!-- CHAPTER LIST -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;">
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0ebe3;">
                <span style="color:#c9a84c;font-family:Georgia,serif;font-size:13px;">01 —</span>
                <span style="color:#1a1a2e;font-size:14px;margin-left:10px;">Protéger et faire fructifier votre épargne</span>
              </td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0ebe3;">
                <span style="color:#c9a84c;font-family:Georgia,serif;font-size:13px;">02 —</span>
                <span style="color:#1a1a2e;font-size:14px;margin-left:10px;">Choisir la couverture santé adaptée à votre vie</span>
              </td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0ebe3;">
                <span style="color:#c9a84c;font-family:Georgia,serif;font-size:13px;">03 —</span>
                <span style="color:#1a1a2e;font-size:14px;margin-left:10px;">Anticiper la transmission de votre patrimoine</span>
              </td></tr>
              <tr><td style="padding:10px 0;border-bottom:1px solid #f0ebe3;">
                <span style="color:#c9a84c;font-family:Georgia,serif;font-size:13px;">04 —</span>
                <span style="color:#1a1a2e;font-size:14px;margin-left:10px;">Planifier votre retraite étape par étape</span>
              </td></tr>
              <tr><td style="padding:10px 0;">
                <span style="color:#c9a84c;font-family:Georgia,serif;font-size:13px;">05 —</span>
                <span style="color:#1a1a2e;font-size:14px;margin-left:10px;">Votre plan d'action personnalisé</span>
              </td></tr>
            </table>

            <!-- CTA BUTTON -->
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

            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr><td style="border-top:1px solid #f0ebe3;"></td></tr>
            </table>

            <p style="font-size:14px;color:#5a5248;line-height:1.7;margin:0 0 24px 0;">
              Des questions sur votre situation personnelle ? Répondez directement à cet email ou prenez rendez-vous pour un entretien gratuit et sans engagement.
            </p>

            <p style="font-size:15px;color:#1a1a2e;margin:0;">
              Bien à vous,<br>
              <strong style="font-family:Georgia,serif;font-weight:400;color:#0f1f3d;">Votre Conseiller</strong><br>
              <span style="font-size:12px;color:#8c8279;">Cabinet Conseil Assurance</span>
            </p>

          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#f4f1eb;padding:28px 48px;border-top:1px solid #e8e2da;">
            <p style="font-size:11px;color:#a09890;margin:0;line-height:1.6;text-align:center;">
              Vous recevez cet email car vous avez demandé notre guide.<br>
              Pour vous désinscrire, répondez "STOP" à cet email.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>

</body>
</html>`;

        const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
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
                htmlContent: emailHtml
            })
        });

        if (!brevoResponse.ok) {
            const err = await brevoResponse.text();
            console.error("Erreur Brevo:", err);
            throw new Error("Erreur lors de l'envoi de l'email");
        }

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
