(function () {
  "use strict";

  /* ================================================================
     Configuration
     Paste your Paystack public key below to enable real card
     payments. Leave empty to run in demo mode (simulated payment).
     ================================================================ */
  var PAYSTACK_PUBLIC_KEY = "";

  var LAB_BOOKING_FEE = 5000;
  var INTERPRETATION_FEE = 3000;

  var SERVICE_CATEGORIES = [
    "Haematology",
    "Microbiology",
    "Serology",
    "Chemical Pathology",
    "Histology & Cytology",
    "Molecular & Special Tests",
    "Radiology Services"
  ];

  var CONSULT_METHODS = [
    { value: "Voice Call", label: "Voice Call" },
    { value: "Video Consultation", label: "Video Consultation" },
    { value: "Written Interpretation", label: "Written Interpretation" }
  ];

  var TIME_SLOTS = [
    "Morning (8am - 11am)",
    "Midday (11am - 2pm)",
    "Afternoon (2pm - 5pm)",
    "Evening (5pm - 7pm)"
  ];

  var state = {
    mode: "choice",
    type: null,
    data: null,
    reference: null,
    amount: 0
  };

  var $ = function (id) { return document.getElementById(id); };

  function escapeHtml(str) {
    return String(str || "").replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function el(tag, attrs, html) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === "class") node.className = attrs[k];
        else if (k === "hidden") node.hidden = attrs[k];
        else node.setAttribute(k, attrs[k]);
      });
    }
    if (html !== undefined) node.innerHTML = html;
    return node;
  }

  /* ================================================================
     Wizard navigation
     ================================================================ */

  function showStep(name) {
    ["choice", "lab", "interpret", "payment", "done"].forEach(function (s) {
      var node = $("step" + s.charAt(0).toUpperCase() + s.slice(1));
      if (node) node.hidden = s !== name;
    });
    var progress = $("wizardProgress");
    if (progress) {
      var order = ["choice", "lab", "interpret", "payment", "done"];
      progress.querySelectorAll(".dot").forEach(function (dot) {
        var idx = dot.getAttribute("data-step");
        dot.classList.toggle("done", order.indexOf(idx) < order.indexOf(name));
        dot.classList.toggle("active", idx === name);
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goChoice() {
    state.mode = "choice";
    state.type = null;
    state.data = null;
    state.reference = null;
    showStep("choice");
  }

  /* ================================================================
     Choice screen
     ================================================================ */

  function startLab() {
    state.mode = "booking";
    state.type = "lab";
    showStep("lab");
  }

  function startInterpret() {
    state.mode = "booking";
    state.type = "interpret";
    showStep("interpret");
  }

  /* ================================================================
     Forms
     ================================================================ */

  function setError(field, message) {
    field.classList.toggle("invalid", !!message);
    var err = field.querySelector(".field-error");
    if (!err) {
      err = el("p", { class: "field-error" });
      field.appendChild(err);
    }
    err.textContent = message || "";
  }

  function validateField(field) {
    var input = field.querySelector("input, select, textarea");
    if (!input) return true;
    var label = (field.querySelector("label") || {}).textContent || "";
    var value = input.value.trim();
    var msg = "";
    if (input.hasAttribute("required") && !value) msg = "Please enter " + label.toLowerCase();
    else if (value && input.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) msg = "Please enter a valid email address";
    else if (value && input.type === "tel" && !/^[0-9+\s-]{10,15}$/.test(value)) msg = "Please enter a valid phone number";
    setError(field, msg);
    return !msg;
  }

  function bindValidation(form) {
    form.querySelectorAll(".form-field").forEach(function (field) {
      var input = field.querySelector("input, select, textarea");
      if (!input) return;
      input.addEventListener("blur", function () { validateField(field); });
      input.addEventListener("input", function () {
        if (field.classList.contains("invalid")) validateField(field);
      });
    });
  }

  function collect(form) {
    var data = {};
    form.querySelectorAll("[name]").forEach(function (input) {
      if (input.type === "radio") {
        if (input.checked) data[input.name] = input.value;
      } else if (input.type === "file") {
        if (input.files && input.files.length) {
          data[input.name] = { name: input.files[0].name, size: input.files[0].size };
        }
      } else {
        data[input.name] = input.value.trim();
      }
    });
    return data;
  }

  /* Lab booking form */
  function initLabForm() {
    var form = $("labForm");
    if (!form) return;

    var catSelect = form.querySelector('[name="category"]');
    SERVICE_CATEGORIES.forEach(function (c) {
      catSelect.appendChild(el("option", { value: c }, escapeHtml(c)));
    });
    var timeSelect = form.querySelector('[name="timeSlot"]');
    TIME_SLOTS.forEach(function (t) {
      timeSelect.appendChild(el("option", { value: t }, escapeHtml(t)));
    });
    bindValidation(form);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll(".form-field").forEach(function (f) {
        if (!validateField(f)) ok = false;
      });
      if (!ok) {
        var firstInvalid = form.querySelector(".form-field.invalid");
        if (firstInvalid) firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      state.data = collect(form);
      state.amount = LAB_BOOKING_FEE;
      renderPayment();
      showStep("payment");
    });
  }

  /* Result interpretation form */
  function initInterpretForm() {
    var form = $("interpretForm");
    if (!form) return;

    var consultWrap = form.querySelector('[data-consult]');
    CONSULT_METHODS.forEach(function (m) {
      consultWrap.appendChild(el("div", { class: "radio-pill" },
        '<input type="radio" name="consultMethod" value="' + escapeHtml(m.value) + '" id="cm-' + m.value.toLowerCase().replace(/\s+/g, "-") + '"' +
        (m.value === "Voice Call" ? ' checked' : "") + '>' +
        '<label for="cm-' + m.value.toLowerCase().replace(/\s+/g, "-") + '">' + escapeHtml(m.label) + "</label>"
      ));
    });

    bindValidation(form);

    var fileInput = form.querySelector('[name="resultFile"]');
    var zone = $("uploadZone");
    var fileLabel = $("uploadedFile");

    function handleFile(files) {
      if (!files || !files.length) return;
      var file = files[0];
      var allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
      if (allowed.indexOf(file.type) === -1) {
        setUploadError("Please upload an image (JPG, PNG) or PDF file.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("File is too large. Maximum size is 5MB.");
        return;
      }
      setUploadError("");
      zone.hidden = true;
      fileLabel.hidden = false;
      fileLabel.querySelector("[data-file-name]").textContent = file.name;
    }

    function setUploadError(msg) {
      var err = $("uploadError");
      if (err) err.textContent = msg;
    }

    if (fileInput && zone) {
      zone.addEventListener("click", function () { fileInput.click(); });
      zone.addEventListener("dragover", function (e) {
        e.preventDefault();
        zone.classList.add("drag");
      });
      zone.addEventListener("dragleave", function () { zone.classList.remove("drag"); });
      zone.addEventListener("drop", function (e) {
        e.preventDefault();
        zone.classList.remove("drag");
        handleFile(e.dataTransfer.files);
      });
      fileInput.addEventListener("change", function () { handleFile(fileInput.files); });
    }

    var removeFile = $("removeFile");
    if (removeFile) {
      removeFile.addEventListener("click", function () {
        if (fileInput) fileInput.value = "";
        zone.hidden = false;
        fileLabel.hidden = true;
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll(".form-field").forEach(function (f) {
        if (!validateField(f)) ok = false;
      });
      if (!fileInput || !fileInput.files.length) {
        setUploadError("Please upload your laboratory result before continuing.");
        ok = false;
      } else {
        setUploadError("");
      }
      if (!ok) return;
      state.data = collect(form);
      state.amount = INTERPRETATION_FEE;
      renderPayment();
      showStep("payment");
    });
  }

  /* ================================================================
     Payment
     ================================================================ */

  function renderPayment() {
    var summary = $("paymentSummary");
    if (!summary) return;

    var rows = [
      ["Service", state.type === "lab" ? "Laboratory / Radiology Booking" : "Result Interpretation"],
      ["Full Name", state.data.fullName],
      ["Phone", state.data.phone],
      ["Email", state.data.email]
    ];
    if (state.type === "lab") {
      rows.push(["Location", state.data.location]);
      rows.push(["Category", state.data.category]);
      rows.push(["Visit Date", state.data.visitDate]);
      rows.push(["Time", state.data.timeSlot]);
    } else {
      rows.push(["Consultation", state.data.consultMethod]);
      rows.push(["Result File", state.data.resultFile ? state.data.resultFile.name : ""]);
    }

    var dl = el("dl");
    rows.forEach(function (r) {
      dl.appendChild(el("div", null,
        "<dt>" + escapeHtml(r[0]) + "</dt><dd>" + escapeHtml(r[1]) + "</dd>"
      ));
    });
    summary.innerHTML = "";
    summary.appendChild(dl);

    $("amountDisplay").textContent = "NGN " + state.amount.toLocaleString("en-NG");

    var methods = document.querySelectorAll(".pay-method");
    methods.forEach(function (m) {
      if (m.getAttribute("data-bound") === "1") return;
      m.setAttribute("data-bound", "1");
      m.addEventListener("click", function () {
        methods.forEach(function (x) { x.classList.remove("active"); });
        m.classList.add("active");
      });
    });
  }

  function startPayment() {
    var btn = $("payButton");
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="pay-spinner"></span> Processing payment...';

    state.reference = "SM-" + new Date().getFullYear() + "-" +
      String(Date.now()).slice(-6);

    var done = function () {
      saveBooking();
      renderConfirmation();
      showStep("done");
    };

    if (PAYSTACK_PUBLIC_KEY && window.PaystackPop) {
      PaystackPop.setup({
        key: PAYSTACK_PUBLIC_KEY,
        email: state.data.email,
        amount: state.amount * 100,
        currency: "NGN",
        ref: state.reference,
        onSuccess: done,
        onCancel: function () {
          btn.disabled = false;
          btn.innerHTML = "Pay " + "NGN " + state.amount.toLocaleString("en-NG");
        }
      }).openIframe();
    } else {
      setTimeout(done, 1800);
    }
  }

  function saveBooking() {
    var record = {
      reference: state.reference,
      type: state.type,
      data: state.data,
      amount: state.amount,
      at: new Date().toISOString(),
      status: "pending_confirmation"
    };
    try {
      var bookings = JSON.parse(localStorage.getItem("soughtout_bookings") || "[]");
      bookings.unshift(record);
      localStorage.setItem("soughtout_bookings", JSON.stringify(bookings));
    } catch (err) {}
  }

  function bookingSummaryText() {
    var d = state.data;
    var lines = [
      "Hello Soughtout Medials, I just completed a booking.",
      "",
      "Booking Reference: " + state.reference,
      "Service: " + (state.type === "lab" ? "Laboratory / Radiology Booking" : "Result Interpretation"),
      "Full Name: " + d.fullName,
      "Phone: " + d.phone,
      "Email: " + d.email
    ];
    if (state.type === "lab") {
      lines.push("Location: " + d.location);
      lines.push("Category: " + d.category);
      lines.push("Preferred Date: " + d.visitDate);
      lines.push("Preferred Time: " + d.timeSlot);
      if (d.doctorsRequest) lines.push("Doctor's Request: " + d.doctorsRequest);
      if (d.notes) lines.push("Notes: " + d.notes);
    } else {
      lines.push("Consultation Method: " + d.consultMethod);
      if (d.resultFile) lines.push("Result File: " + d.resultFile.name);
      if (d.notes) lines.push("Notes: " + d.notes);
    }
    lines.push("Amount Paid: NGN " + state.amount.toLocaleString("en-NG"));
    return lines.join("\n");
  }

  function renderConfirmation() {
    var box = $("confirmationBox");
    if (!box) return;
    box.innerHTML = "";

    var icon = el("div", { class: "confirm-icon" },
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    );

    var h2 = el("h2", null, "Your booking has been received.");
    var p = el("p", { class: "lead" },
      "Your booking has been received. Our medical team will contact you shortly to confirm your appointment.");

    var ref = el("span", { class: "confirm-ref" }, "Reference: " + state.reference);

    var p2 = el("p", { class: "pay-note" },
      "You can speed up confirmation by sending your booking details to us on WhatsApp.");

    var row = el("div", { class: "btn-row" });
    var waBtn = el("a", {
      class: "btn btn-whatsapp",
      href: window.SOUGHTOUT.whatsappLink(bookingSummaryText()),
      target: "_blank",
      rel: "noopener"
    }, window.SOUGHTOUT.waIcon() + "Send Booking on WhatsApp");
    var againBtn = el("a", { class: "btn btn-outline", href: "book.html" }, "Book Another Appointment");

    row.appendChild(waBtn);
    row.appendChild(againBtn);

    box.appendChild(icon);
    box.appendChild(h2);
    box.appendChild(p);
    box.appendChild(ref);
    box.appendChild(p2);
    box.appendChild(row);
  }

  /* ================================================================
     Init
     ================================================================ */

  function init() {
    initLabForm();
    initInterpretForm();

    var startLabBtn = $("startLab");
    var startInterpretBtn = $("startInterpret");
    if (startLabBtn) startLabBtn.addEventListener("click", startLab);
    if (startInterpretBtn) startInterpretBtn.addEventListener("click", startInterpret);

    var payButton = $("payButton");
    if (payButton) payButton.addEventListener("click", startPayment);

    var backToChoice = $("backToChoice");
    if (backToChoice) backToChoice.addEventListener("click", goChoice);

    if (document.body.hasAttribute("data-booking-mode")) {
      var mode = document.body.getAttribute("data-booking-mode");
      if (mode === "interpret") {
        startInterpret();
      } else if (mode === "choice") {
        showStep("choice");
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
