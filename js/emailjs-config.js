// Configuration EmailJS + reCAPTCHA v2 (checkbox) pour le formulaire de contact.
// Renseigne ces valeurs depuis ton dashboard EmailJS / Google reCAPTCHA.
//
// IMPORTANT:
// - La clé EmailJS ci-dessous est une clé *publique* (côté navigateur), comme sur EmailJS.
// - reCAPTCHA v2 utilise une clé *site* publique.
// - Le destinataire final est en général défini dans le *template* EmailJS (recommandé),
//   mais tu peux aussi utiliser un champ `to_email` si ton template l'affiche/expédite.

window.MBL_EMAILJS = {
  enabled: true,

  // EmailJS (public key)
  publicKey: "8sLhN8AQ-v16yThPc",

  // EmailJS (IDs)
  serviceId: "service_6jwlyn7",
  templateId: "template_vkrgu6j",

  // Google reCAPTCHA v2 (site key) — domaine: www.mblaccompagnement.fr
  recaptchaSiteKey: "6Lf_4MAsAAAAANIUHiN5KzQ0JMtvHI-yTumX3RFg",

  // Optionnel: si ton template EmailJS utilise explicitement un champ `to_email`
  toEmail: "contact@mblaccompagnement.fr",

  // (v2 checkbox) pas d'action à définir
};
