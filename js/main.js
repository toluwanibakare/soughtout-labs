(function () {
  "use strict";

  var PHONE_DISPLAY = "0706 053 1678";
  var PHONE_TEL = "07060531678";
  var PHONE_TEL_2 = "08064774564";
  var WHATSAPP_NUMBER = "2347060531678";
  var WHATSAPP_LINK = "https://wa.me/" + WHATSAPP_NUMBER;

  function whatsappLink(message) {
    return WHATSAPP_LINK + "?text=" + encodeURIComponent(message || "");
  }

  window.SOUGHTOUT = {
    PHONE_DISPLAY: PHONE_DISPLAY,
    PHONE_TEL: PHONE_TEL,
    PHONE_TEL_2: PHONE_TEL_2,
    WHATSAPP_LINK: WHATSAPP_LINK,
    whatsappLink: whatsappLink
  };

  /* Header scroll shadow + mobile nav */
  var header = document.querySelector(".header-main");
  var navToggle = document.querySelector(".nav-toggle");
  var siteNav = document.querySelector(".site-nav");

  if (header) {
    window.addEventListener("scroll", function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    }, { passive: true });
  }

  if (navToggle && siteNav) {
    var backdrop = document.createElement("div");
    backdrop.className = "nav-backdrop";
    document.body.appendChild(backdrop);

    function setNav(open) {
      siteNav.classList.toggle("open", open);
      navToggle.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      backdrop.classList.toggle("show", open);
      document.body.classList.toggle("nav-locked", open);
    }

    navToggle.addEventListener("click", function () {
      setNav(!siteNav.classList.contains("open"));
    });

    backdrop.addEventListener("click", function () {
      setNav(false);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setNav(false);
    });

    var navClose = document.getElementById("navClose");
    if (navClose) navClose.addEventListener("click", function () { setNav(false); });

    siteNav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false);
    });
  }

  /* Active nav link */
  var current = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".site-nav a").forEach(function (a) {
    if (a.getAttribute("href") === current) a.classList.add("active");
  });

  /* Footer year */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* FAQ accordion */
  document.querySelectorAll(".faq-item").forEach(function (item) {
    var q = item.querySelector(".faq-q");
    var a = item.querySelector(".faq-a");
    if (!q || !a) return;
    q.addEventListener("click", function () {
      var isOpen = item.classList.contains("open");
      document.querySelectorAll(".faq-item.open").forEach(function (openItem) {
        openItem.classList.remove("open");
        openItem.querySelector(".faq-a").style.maxHeight = null;
      });
      if (!isOpen) {
        item.classList.add("open");
        a.style.maxHeight = a.scrollHeight + "px";
      }
    });
  });

  /* Reveal on scroll */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("visible"); });
  }

  /* ==================================================================
     Live chat widget
     ================================================================== */

  var chatLauncher = document.getElementById("chatLauncher");
  var chatPanel = document.getElementById("chatPanel");
  var chatClose = document.getElementById("chatClose");
  var chatBody = document.getElementById("chatBody");
  var chatFormWrap = document.getElementById("chatFormWrap");
  var chatForm = document.getElementById("chatForm");
  var chatInput = document.getElementById("chatInput");
  var chatSend = document.getElementById("chatSend");
  var chatWhatsApp = document.getElementById("chatWhatsApp");
  var chatNewQuestion = document.getElementById("chatNewQuestion");

  var QUICK_QA = [
    {
      q: "How do I book a test?",
      a: "Go to the Book Appointment page, choose the service you need, complete the short booking form, and make a secure payment. You will receive a confirmation shortly after."
    },
    {
      q: "Do I need to visit a laboratory?",
      a: "No. Soughtout Medials provides mobile laboratory and radiology services. The specialist comes to your preferred location - your home, office, school, hotel or hospital - after your booking is confirmed."
    },
    {
      q: "How do I receive my results?",
      a: "Your results are delivered through your preferred channel - phone call, WhatsApp, or email - after analysis is completed and quality checks are done."
    },
    {
      q: "How can I pay?",
      a: "Payment is made securely online after completing your booking. You can pay by card or bank transfer. You will receive a receipt and a booking reference."
    },
    {
      q: "Can you interpret my lab result?",
      a: "Yes. Use the Result Interpretation page to upload your results and choose a voice call, video consultation, or written interpretation."
    }
  ];

  function openChat() {
    chatPanel.classList.add("open");
    chatLauncher.style.display = "none";
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function closeChat() {
    chatPanel.classList.remove("open");
    chatLauncher.style.display = "flex";
  }

  function addBotMessage(text) {
    var el = document.createElement("div");
    el.className = "chat-msg chat-msg--bot";
    el.textContent = text;
    chatBody.insertBefore(el, chatFormWrap);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function addUserMessage(text) {
    var el = document.createElement("div");
    el.className = "chat-msg chat-msg--user";
    el.textContent = text;
    chatBody.insertBefore(el, chatFormWrap);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showQuickQuestions() {
    var wrap = document.createElement("div");
    wrap.className = "chat-quick";
    QUICK_QA.forEach(function (qa) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = qa.q;
      btn.addEventListener("click", function () {
        addUserMessage(qa.q);
        wrap.remove();
        addBotMessage(qa.a);
      });
      wrap.appendChild(btn);
    });
    chatBody.insertBefore(wrap, chatFormWrap);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  function showOfflineForm() {
    chatFormWrap.hidden = false;
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  if (chatLauncher) chatLauncher.addEventListener("click", openChat);
  if (chatClose) chatClose.addEventListener("click", closeChat);

  if (chatWhatsApp) {
    chatWhatsApp.href = whatsappLink(
      "Hello, I would like to speak with the Soughtout Medials team."
    );
    chatWhatsApp.target = "_blank";
    chatWhatsApp.rel = "noopener";
  }

  if (chatNewQuestion) {
    chatNewQuestion.addEventListener("click", function () {
      chatFormWrap.hidden = true;
      showQuickQuestions();
    });
  }

  if (chatBody) {
    showQuickQuestions();
  }

  function handleUserChatSubmit(e) {
    if (e && e.preventDefault) e.preventDefault();
    var message = chatInput.value.trim();
    if (!message) return;
    addUserMessage(message);
    chatInput.value = "";
    setTimeout(function () {
      addBotMessage(
        "Thank you for your message. Mbaba is currently unavailable but will get back to you shortly. For faster response, please share your contact details below."
      );
      showOfflineForm();
    }, 700);
  }

  if (chatSend && chatInput) {
    chatSend.addEventListener("click", handleUserChatSubmit);
    chatInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") handleUserChatSubmit(e);
    });
  }

  if (chatForm) {
    chatForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (chatForm.querySelector('[name="name"]').value || "").trim();
      var phone = (chatForm.querySelector('[name="phone"]').value || "").trim();
      var email = (chatForm.querySelector('[name="email"]').value || "").trim();
      var message = (chatForm.querySelector('[name="message"]').value || "").trim();
      if (!name || !phone || !message) {
        addBotMessage("Please complete your name, phone number and message so the team can reach you.");
        return;
      }
      try {
        var leads = JSON.parse(localStorage.getItem("soughtout_leads") || "[]");
        leads.push({ name: name, phone: phone, email: email, message: message, at: new Date().toISOString() });
        localStorage.setItem("soughtout_leads", JSON.stringify(leads));
      } catch (err) {}

      var text = "Hello Soughtout Medicals. New message from " + name +
        " (Phone: " + phone + (email ? ", Email: " + email : "") + "): " + message;

      var done = document.createElement("div");
      done.className = "chat-msg chat-msg--bot";
      done.innerHTML = "Thanks " + escapeHtml(name) +
        ", your message has been saved. You can also continue this conversation on WhatsApp for an instant response.";

      chatFormWrap.hidden = true;
      chatBody.insertBefore(done, chatFormWrap);

      var wa = document.createElement("a");
      wa.className = "chat-wa-btn";
      wa.href = whatsappLink(text);
      wa.target = "_blank";
      wa.rel = "noopener";
      wa.innerHTML = waIcon() + "Continue on WhatsApp";
      chatBody.insertBefore(wa, chatFormWrap);
      chatBody.scrollTop = chatBody.scrollHeight;

      chatForm.reset();
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  window.escapeHtml = escapeHtml;

  function waIcon() {
    return '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29z"/></svg>';
  }

  window.SOUGHTOUT.waIcon = waIcon;

  /* ==================================================================
     Contact page form
     ================================================================= */

  var contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = (contactForm.querySelector('[name="name"]').value || "").trim();
      var phone = (contactForm.querySelector('[name="phone"]').value || "").trim();
      var email = (contactForm.querySelector('[name="email"]').value || "").trim();
      var message = (contactForm.querySelector('[name="message"]').value || "").trim();
      var errorBox = document.getElementById("contactError");
      var successBox = document.getElementById("contactSuccess");
      if (!name || !phone || !message) {
        if (errorBox) errorBox.textContent = "Please complete your name, phone number and message.";
        return;
      }
      if (errorBox) errorBox.textContent = "";
      try {
        var leads = JSON.parse(localStorage.getItem("soughtout_leads") || "[]");
        leads.push({ name: name, phone: phone, email: email, message: message, at: new Date().toISOString() });
        localStorage.setItem("soughtout_leads", JSON.stringify(leads));
      } catch (err) {}

      var text = "Hello Soughtout Medicals. New message from " + name +
        " (Phone: " + phone + (email ? ", Email: " + email : "") + "): " + message;
      window.open(whatsappLink(text), "_blank", "noopener");

      if (successBox) successBox.hidden = false;
      contactForm.reset();
    });
  }
})();
