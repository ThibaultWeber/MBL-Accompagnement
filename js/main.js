/** @type {Promise<void> | null} */
let recaptchaReadyPromise = null;

/**
 * reCAPTCHA v2 checkbox est chargé via `contact.html` (api.js).
 * @returns {Promise<void>}
 */
function ensureRecaptchaV2() {
  if (window.grecaptcha && typeof window.grecaptcha.getResponse === "function") {
    return Promise.resolve();
  }
  if (!recaptchaReadyPromise) {
    recaptchaReadyPromise = new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const tick = () => {
        if (window.grecaptcha && typeof window.grecaptcha.getResponse === "function") {
          resolve();
          return;
        }
        if (Date.now() - startedAt > 8000) {
          reject(new Error("reCAPTCHA n’est pas prêt. Vérifiez le chargement de l’API reCAPTCHA v2."));
          return;
        }
        window.setTimeout(tick, 50);
      };
      tick();
    });
  }
  return recaptchaReadyPromise;
}

/** @type {boolean} */
let emailJsInitialized = false;

/**
 * @param {string} publicKey
 */
function ensureEmailJs(publicKey) {
  if (typeof emailjs === "undefined") {
    throw new Error("EmailJS n’est pas chargé. Vérifiez l’inclusion du script sur la page contact.");
  }
  if (!emailJsInitialized) {
    emailjs.init(publicKey);
    emailJsInitialized = true;
  }
}

/**
 * @param {unknown} cfg
 * @returns {cfg is { enabled: boolean; publicKey: string; serviceId: string; templateId: string; recaptchaSiteKey: string; toEmail?: string; recaptchaAction?: string }}
 */
function isEmailJsConfigReady(cfg) {
  if (!cfg || typeof cfg !== "object") return false;
  const c = /** @type {Record<string, unknown>} */ (cfg);
  if (c.enabled !== true) return false;
  const keys = ["publicKey", "serviceId", "templateId", "recaptchaSiteKey"];
  for (const k of keys) {
    const v = c[k];
    if (typeof v !== "string" || !v.trim()) return false;
    if (v.includes("REMPLACER")) return false;
  }
  return true;
}

function initMobileNav() {
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");

  if (!toggle || !nav) return;

  const setOpen = (isOpen) => {
    nav.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", String(isOpen));
  };

  setOpen(false);

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    setOpen(!isOpen);
  });

  nav.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.matches("a.nav-link")) setOpen(false);
  });
}

function initContactForm() {
  const form = document.getElementById("contactForm");
  const status = document.getElementById("formStatus");
  const recaptchaWidget = document.getElementById("recaptchaWidget");
  /** @type {number | null} */
  let recaptchaWidgetId = null;

  if (!(form instanceof HTMLFormElement)) return;
  if (!(status instanceof HTMLElement)) return;

  const get = (id) => document.getElementById(id);

  const nom = get("nom");
  const email = get("email");
  const objet = get("objet");
  const message = get("message");

  const fields = [nom, email, objet, message].filter((x) => x instanceof HTMLElement);

  const setStatus = (kind, text) => {
    status.classList.remove("is-error", "is-success");
    if (kind) status.classList.add(kind === "error" ? "is-error" : "is-success");
    status.textContent = text || "";
  };

  const isEmailValid = (value) => {
    const v = String(value || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  };

  const setFieldInvalid = (el, isInvalid) => {
    if (!(el instanceof HTMLElement)) return;
    el.setAttribute("aria-invalid", String(isInvalid));
  };

  const cfgAtInit = window.MBL_EMAILJS;
  if (recaptchaWidget instanceof HTMLElement && isEmailJsConfigReady(cfgAtInit)) {
    // Rendu explicite du widget (évite "No reCAPTCHA clients exist").
    ensureRecaptchaV2()
      .then(() => {
        if (!window.grecaptcha || typeof window.grecaptcha.render !== "function") return;
        if (recaptchaWidgetId !== null) return;
        recaptchaWidgetId = window.grecaptcha.render(recaptchaWidget, {
          sitekey: cfgAtInit.recaptchaSiteKey,
        });
      })
      .catch(() => {
        // L'affichage d'erreur est géré au submit si besoin.
      });
  }

  const submitBtn = form.querySelector('button[type="submit"]');
  const defaultSubmitLabel =
    submitBtn instanceof HTMLButtonElement ? submitBtn.textContent || "Envoyer" : "Envoyer";

  const setSubmitting = (isSubmitting) => {
    if (!(submitBtn instanceof HTMLButtonElement)) return;
    submitBtn.disabled = isSubmitting;
    submitBtn.textContent = isSubmitting ? "Envoi en cours…" : defaultSubmitLabel;
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    setStatus(null, "");

    const nomV = nom instanceof HTMLInputElement ? nom.value.trim() : "";
    const emailV = email instanceof HTMLInputElement ? email.value.trim() : "";
    const objetV = objet instanceof HTMLInputElement ? objet.value.trim() : "";
    const messageV = message instanceof HTMLTextAreaElement ? message.value.trim() : "";

    let ok = true;

    if (!nomV) ok = false;
    if (!emailV || !isEmailValid(emailV)) ok = false;
    if (!objetV) ok = false;
    if (!messageV) ok = false;

    setFieldInvalid(nom, !nomV);
    setFieldInvalid(email, !(emailV && isEmailValid(emailV)));
    setFieldInvalid(objet, !objetV);
    setFieldInvalid(message, !messageV);

    if (!ok) {
      setStatus("error", "Merci de compléter les champs requis (email valide).");
      const firstInvalid = fields.find((el) => el.getAttribute("aria-invalid") === "true");
      if (firstInvalid && "focus" in firstInvalid) firstInvalid.focus();
      return;
    }

    const cfg = window.MBL_EMAILJS;
    if (!isEmailJsConfigReady(cfg)) {
      setStatus(
        "error",
        "L’envoi n’est pas configuré : renseignez publicKey, serviceId, templateId et recaptchaSiteKey dans js/emailjs-config.js (sans laisser les valeurs « REMPLACER… »)."
      );
      return;
    }

    setSubmitting(true);

    ensureRecaptchaV2()
      .then(() => {
        if (!window.grecaptcha) throw new Error("reCAPTCHA indisponible.");
        const token =
          recaptchaWidgetId !== null ? window.grecaptcha.getResponse(recaptchaWidgetId) : window.grecaptcha.getResponse();
        if (!token) {
          throw new Error("Merci de valider le reCAPTCHA.");
        }
        return token;
      })
      .then((token) => {
        ensureEmailJs(cfg.publicKey);
        const toEmail =
          typeof cfg.toEmail === "string" && cfg.toEmail.trim() ? cfg.toEmail.trim() : "contact@mblaccompagnement.fr";
        const sendAt = new Date().toLocaleString("fr-FR", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        });
        /** @type {Record<string, string>} */
        const templateParams = {
          from_name: nomV,
          from_email: emailV,
          subject: objetV,
          message: messageV,
          send_at: sendAt,
          "g-recaptcha-response": token,
          to_email: toEmail,
        };
        return emailjs.send(cfg.serviceId, cfg.templateId, templateParams);
      })
      .then(() => {
        setStatus("success", "Message envoyé. Nous vous répondrons dès que possible.");
        form.reset();
        fields.forEach((el) => setFieldInvalid(el, false));
        if (window.grecaptcha && typeof window.grecaptcha.reset === "function") {
          if (recaptchaWidgetId !== null) window.grecaptcha.reset(recaptchaWidgetId);
          else window.grecaptcha.reset();
        }
      })
      .catch((err) => {
        const raw =
          err && typeof err === "object" && "text" in err && typeof err.text === "string"
            ? err.text
            : err instanceof Error
              ? err.message
              : "Une erreur est survenue lors de l’envoi.";

        const msg = String(raw || "");
        if (msg.includes("invalid-input-response")) {
          setStatus(
            "error",
            "reCAPTCHA invalide/expiré. Merci de recocher la case reCAPTCHA puis de renvoyer immédiatement."
          );
        } else {
          setStatus("error", msg || "Une erreur est survenue lors de l’envoi.");
        }

        // En cas d’échec, on reset pour éviter un token expiré/réutilisé.
        if (window.grecaptcha && typeof window.grecaptcha.reset === "function") {
          if (recaptchaWidgetId !== null) window.grecaptcha.reset(recaptchaWidgetId);
          else window.grecaptcha.reset();
        }
      })
      .finally(() => {
        setSubmitting(false);
      });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initMobileNav();
  initContactForm();
});

