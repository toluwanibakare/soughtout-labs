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

  var LAB_BOOKING_FEE = 0; // Base fee is 0, since it is calculated from tests.
  var INTERPRETATION_FEE = 3000;

  var TESTS_BY_CATEGORY = {
    "Haematology": [
      { name: "Blood group", price: 8000 },
      { name: "Genotype", price: 8000 },
      { name: "Full blood count", price: 15000 },
      { name: "Full blood count plus ESR", price: 20000 },
      { name: "ESR", price: 5000 },
      { name: "HB", price: 5000 },
      { name: "PCV", price: 5000 },
      { name: "BLOOD FILM", price: 30000 }
    ],
    "Microbiology": [
      { name: "Malaria Parasite", price: 3000 },
      { name: "Widal Test", price: 7000 },
      { name: "Urine M/C/S", price: 18000, note: "Takes 48-72hrs to grow organisms" },
      { name: "Blood Culture", price: 35000, note: "Takes 48-72hrs to grow organisms" },
      { name: "HVS M/C/S", price: 12000, note: "Takes 48-72hrs to grow organisms" },
      { name: "Stool M/C/S", price: 22000, note: "Takes 48-72hrs to grow organisms" },
      { name: "HIV Test", price: 5000 },
      { name: "Hep B Surface Antigen", price: 8000 },
      { name: "Hep C Antibody", price: 7000 },
      { name: "SPUTUM MCS", price: 15000, note: "Takes 48-72hrs to grow organisms" }
    ],
    "Chemical Pathology": [
      { name: "Eucr", price: 25000 },
      { name: "LIVER FUNCTION (LFT)", price: 25000 },
      { name: "Lipid profile", price: 30000 },
      { name: "Female Hormone profile", price: 60000 },
      { name: "Male Hormone profile", price: 50000 },
      { name: "HbA1C", price: 30000 },
      { name: "Serum Prolactin", price: 20000 }
    ],
    "Serology": [
      { name: "HIV Screening", price: 5000 },
      { name: "Hepatitis B & C Screening", price: 15000 },
      { name: "Syphilis (VDRL) Test", price: 5000 },
      { name: "Widal Panel", price: 7000 }
    ],
    "Histology & Cytology": [
      { name: "Tissue Biopsy Pathology", price: 45000 },
      { name: "Pap Smear Cytology", price: 20000 }
    ],
    "Molecular & Special Tests": [
      { name: "DNA PCR Test", price: 80000 },
      { name: "HbA1c Glycated Hemoglobin", price: 30000 }
    ],
    "Radiology Services": [
      { name: "Ultrasound Scan (Abdominal)", price: 15000 },
      { name: "Radiology Referral & Review", price: 10000 }
    ]
  };

  var SERVICE_CATEGORIES = Object.keys(TESTS_BY_CATEGORY);

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
    amount: 0,
    selectedTests: []
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
    state.selectedTests = [];
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
      } else if (input.type === "checkbox") {
        // Handled separately
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

    catSelect.addEventListener("change", function () {
      var cat = catSelect.value;
      var tests = TESTS_BY_CATEGORY[cat] || [];
      var area = $("testsSelectionArea");
      var list = $("testsCheckboxList");
      
      list.innerHTML = "";
      state.selectedTests = [];
      updateTestsTotal();

      if (tests.length > 0) {
        area.hidden = false;
        tests.forEach(function (t, index) {
          var item = el("div", { class: "test-item" });
          var noteHtml = t.note ? '<br><small style="color:var(--text-soft); font-weight:normal;">' + escapeHtml(t.note) + '</small>' : '';
          
          item.innerHTML = '<div class="test-item-meta">' +
            '<input type="checkbox" id="test-' + index + '" value="' + escapeHtml(t.name) + '" data-price="' + t.price + '">' +
            '<label for="test-' + index + '">' + escapeHtml(t.name) + noteHtml + '</label>' +
            '</div>' +
            '<span class="price-badge">₦' + t.price.toLocaleString("en-NG") + '</span>';

          var chk = item.querySelector('input');
          chk.addEventListener("change", function () {
            item.classList.toggle("selected", chk.checked);
            if (chk.checked) {
              state.selectedTests.push({ name: t.name, price: t.price });
            } else {
              state.selectedTests = state.selectedTests.filter(function (x) { return x.name !== t.name; });
            }
            updateTestsTotal();
          });

          // Allow clicking entire box to select
          item.addEventListener("click", function (e) {
            if (e.target !== chk && e.target.tagName !== "LABEL") {
              chk.checked = !chk.checked;
              chk.dispatchEvent(new Event("change"));
            }
          });

          list.appendChild(item);
        });
      } else {
        area.hidden = true;
      }
    });

    function updateTestsTotal() {
      var total = state.selectedTests.reduce(function (acc, x) { return acc + x.price; }, 0);
      $("testsTotalDisplay").textContent = "₦" + total.toLocaleString("en-NG");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll(".form-field").forEach(function (f) {
        if (!f.hidden && !validateField(f)) ok = false;
      });

      // Require at least one test unless "Others" text box is filled
      var othersVal = $("lab-others").value.trim();
      if (state.selectedTests.length === 0 && !othersVal) {
        alert("Please select at least one test or specify what you would like to test for in the others field.");
        ok = false;
      }

      if (!ok) {
        var firstInvalid = form.querySelector(".form-field.invalid");
        if (firstInvalid) firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }

      state.data = collect(form);
      state.data.selectedTests = state.selectedTests;
      state.amount = state.selectedTests.reduce(function (acc, x) { return acc + x.price; }, 0);
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
     Payment / WhatsApp Direct Submission
     ================================================================ */

  function renderPayment() {
    var summary = $("paymentSummary");
    if (!summary) return;

    var rows = [
      ["Service", state.type === "lab" ? "Laboratory Booking" : "Result Interpretation"],
      ["Full Name", state.data.fullName],
      ["Phone", state.data.phone],
      ["Email", state.data.email]
    ];
    if (state.type === "lab") {
      rows.push(["Location", state.data.location]);
      rows.push(["Category", state.data.category]);
      
      var testNames = state.selectedTests.map(function(t) { return t.name; }).join(", ");
      if (state.data.othersInput) {
        testNames += (testNames ? ", " : "") + state.data.othersInput + " (Custom/Other)";
      }
      rows.push(["Selected Tests", testNames || "Custom Request Only"]);
      
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

    $("amountDisplay").textContent = state.amount > 0 ? "₦" + state.amount.toLocaleString("en-NG") : "Price on Request / Consultation";
  }

  function startPayment() {
    var btn = $("payButton");
    if (!btn) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="pay-spinner"></span> Creating WhatsApp link...';

    state.reference = "SM-" + new Date().getFullYear() + "-" +
      String(Date.now()).slice(-6);

    saveBooking();
    
    // Redirect to WhatsApp immediately
    var waUrl = window.SOUGHTOUT.whatsappLink(bookingSummaryText());
    window.open(waUrl, "_blank", "noopener");

    // Display confirmation screen
    renderConfirmation();
    showStep("done");
  }

  function saveBooking() {
    var record = {
      reference: state.reference,
      type: state.type,
      data: state.data,
      amount: state.amount,
      at: new Date().toISOString(),
      status: "whatsapp_submitted"
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
      "Hello Soughtout Medicals, I want to submit a booking request.",
      "",
      "Reference: " + state.reference,
      "Service: " + (state.type === "lab" ? "Laboratory / Radiology Booking" : "Result Interpretation"),
      "Full Name: " + d.fullName,
      "Phone: " + d.phone,
      "Email: " + d.email
    ];
    if (state.type === "lab") {
      lines.push("Location: " + d.location);
      lines.push("Category: " + d.category);
      
      var tests = state.selectedTests.map(function(t) { return t.name + " (₦" + t.price.toLocaleString("en-NG") + ")"; }).join(", ");
      if (tests) lines.push("Selected Tests: " + tests);
      if (d.othersInput) lines.push("Other Tests Requested: " + d.othersInput);
      
      lines.push("Preferred Date: " + d.visitDate);
      lines.push("Preferred Time: " + d.timeSlot);
      if (d.notes) lines.push("Notes: " + d.notes);
      lines.push("Estimated Price: " + (state.amount > 0 ? "₦" + state.amount.toLocaleString("en-NG") : "Price on Request"));
    } else {
      lines.push("Consultation Method: " + d.consultMethod);
      if (d.resultFile) lines.push("Result File Attached: " + d.resultFile.name);
      if (d.notes) lines.push("Notes: " + d.notes);
      lines.push("Interpretation Fee: ₦" + state.amount.toLocaleString("en-NG"));
    }
    return lines.join("\n");
  }

  function renderConfirmation() {
    var box = $("confirmationBox");
    if (!box) return;
    box.innerHTML = "";

    var icon = el("div", { class: "confirm-icon" },
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>'
    );

    var h2 = el("h2", null, "Redirecting to WhatsApp...");
    var p = el("p", { class: "lead" },
      "Your booking details have been prepared. A WhatsApp chat window has been opened to send this directly to our team.");

    var ref = el("span", { class: "confirm-ref" }, "Reference: " + state.reference);

    var p2 = el("p", { class: "pay-note" },
      "If the WhatsApp window did not open, you can click the button below to submit manually.");

    var row = el("div", { class: "btn-row" });
    var waBtn = el("a", {
      class: "btn btn-whatsapp",
      href: window.SOUGHTOUT.whatsappLink(bookingSummaryText()),
      target: "_blank",
      rel: "noopener"
    }, window.SOUGHTOUT.waIcon() + "Submit on WhatsApp");
    var againBtn = el("a", { class: "btn btn-outline", href: "book.html" }, "Start New Booking");

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

