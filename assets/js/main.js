/* =========================================================
   Fullstack Notes — shared behaviour
   - navbar + footer injection
   - code blocks (<script type="text/plain" class="code">) -> highlighted <pre>
   - auto table of contents grouped by level + scrollspy
   - "mark as done" progress (localStorage)
   - dark / light theme toggle
   - quizzes, back-to-top
   ========================================================= */
(function () {
  "use strict";

  const PAGES = [
    { id: "home",       href: "index.html",      label: "Home",       icon: "bi-house-door" },
    { id: "frontend",   href: "frontend.html",   label: "Frontend",   icon: "bi-window-sidebar" },
    { id: "backend",    href: "backend.html",    label: "Backend",    icon: "bi-hdd-stack" },
    { id: "postgres",   href: "postgresql.html", label: "PostgreSQL", icon: "bi-database" },
    { id: "typescript", href: "typescript.html", label: "TypeScript", icon: "bi-braces-asterisk" },
    { id: "react",      href: "react.html",      label: "Context & Redux", icon: "bi-diagram-3" }
  ];

  /* ---------- safe storage ---------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }
  };
  const readJSON = (k, fallback) => { try { return JSON.parse(store.get(k)) ?? fallback; } catch (e) { return fallback; } };

  const root = document.documentElement;
  const pageId = document.body.dataset.page || "home";

  /* ---------- theme ---------- */
  function currentTheme() { return root.getAttribute("data-bs-theme") || "light"; }
  function setTheme(t) {
    root.setAttribute("data-bs-theme", t);
    store.set("fsn-theme", t);
    document.querySelectorAll(".theme-btn i").forEach(i => {
      i.className = t === "dark" ? "bi bi-sun" : "bi bi-moon-stars";
    });
  }

  /* ---------- navbar ---------- */
  function renderNav() {
    const host = document.getElementById("site-nav");
    if (!host) return;
    const links = PAGES.map(p => `
      <li class="nav-item">
        <a class="nav-link ${p.id === pageId ? "active" : ""}" href="${p.href}">
          <i class="bi ${p.icon} me-1"></i>${p.label}
        </a>
      </li>`).join("");
    host.outerHTML = `
      <nav class="navbar navbar-expand-lg fixed-top site-nav">
        <div class="container-xl">
          <a class="navbar-brand d-flex align-items-center" href="index.html">
            <span class="brand-logo"><i class="bi bi-stack"></i></span>Fullstack<span style="color:var(--accent)">Notes</span>
          </a>
          <div class="d-flex align-items-center gap-2 order-lg-last">
            <button class="theme-btn" type="button" aria-label="Toggle dark mode"><i class="bi bi-moon-stars"></i></button>
            <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-label="Menu">
              <span class="navbar-toggler-icon"></span>
            </button>
          </div>
          <div class="collapse navbar-collapse" id="mainNav">
            <ul class="navbar-nav ms-auto me-lg-3 gap-lg-1">${links}</ul>
          </div>
        </div>
      </nav>`;
    document.querySelectorAll(".theme-btn").forEach(b =>
      b.addEventListener("click", () => setTheme(currentTheme() === "dark" ? "light" : "dark")));
    setTheme(currentTheme());
  }

  function renderFooter() {
    const host = document.getElementById("site-footer");
    if (!host) return;
    host.outerHTML = `
      <footer class="site-footer py-4 mt-5">
        <div class="container-xl d-flex flex-wrap justify-content-between gap-2">
          <span><i class="bi bi-stack me-1"></i> Fullstack Notes — Next.js · PostgreSQL · TypeScript · React</span>
          <span>${PAGES.filter(p => p.id !== "home").map(p => `<a href="${p.href}" class="me-3 text-decoration-none">${p.label}</a>`).join("")}</span>
        </div>
      </footer>`;
  }

  /* ---------- code blocks ---------- */
  function dedent(text) {
    const lines = text.replace(/\t/g, "  ").split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    const indents = lines.filter(l => l.trim()).map(l => l.match(/^ */)[0].length);
    const min = indents.length ? Math.min(...indents) : 0;
    return lines.map(l => l.slice(min)).join("\n");
  }

  const LANG_LABEL = { tsx: "TSX", ts: "TypeScript", typescript: "TypeScript", js: "JavaScript", jsx: "JSX", javascript: "JavaScript", sql: "SQL", bash: "Terminal", shell: "Terminal", json: "JSON", html: "HTML", xml: "HTML", css: "CSS", prisma: "Prisma", plaintext: "Text", env: ".env" };

  function renderCode() {
    document.querySelectorAll('script[type="text/plain"].code').forEach(s => {
      const lang = s.dataset.lang || "plaintext";
      const title = s.dataset.title || "";
      const code = dedent(s.textContent);
      const wrap = document.createElement("div");
      wrap.className = "code-block";
      wrap.innerHTML = `
        <div class="code-head">
          <span class="dots"><span></span><span></span><span></span></span>
          ${title ? `<span class="file"><i class="bi bi-file-earmark-code me-1"></i></span>` : ""}
          <span class="lang">${LANG_LABEL[lang] || lang}</span>
          <button class="copy-btn" type="button"><i class="bi bi-clipboard"></i> Copy</button>
        </div>
        <pre><code></code></pre>`;
      if (title) wrap.querySelector(".file").append(title);
      const codeEl = wrap.querySelector("code");
      codeEl.textContent = code;
      const hlLang = { prisma: "plaintext", env: "bash", html: "xml", shell: "bash" }[lang] || lang;
      if (window.hljs) {
        codeEl.className = "language-" + (hljs.getLanguage(hlLang) ? hlLang : "plaintext");
        try { hljs.highlightElement(codeEl); } catch (e) { /* ignore */ }
      }
      wrap.querySelector(".copy-btn").addEventListener("click", e => copyText(code, e.currentTarget));
      s.replaceWith(wrap);
    });
  }

  function copyText(text, btn) {
    const done = () => {
      btn.innerHTML = '<i class="bi bi-check2"></i> Copied';
      setTimeout(() => (btn.innerHTML = '<i class="bi bi-clipboard"></i> Copy'), 1500);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (e) { /* ignore */ }
    ta.remove();
  }

  /* ---------- TOC + progress ---------- */
  const LEVELS = {
    basic: { label: "Basic", icon: "bi-1-circle-fill" },
    inter: { label: "Intermediate", icon: "bi-2-circle-fill" },
    adv:   { label: "Advanced", icon: "bi-3-circle-fill" },
    extra: { label: "Practice & Review", icon: "bi-star-fill" }
  };

  function buildTOC() {
    const sections = [...document.querySelectorAll("section.note-section")];
    if (!sections.length) return;

    const doneKey = "fsn-done-" + pageId;
    let done = new Set(readJSON(doneKey, []));
    store.set("fsn-total-" + pageId, String(sections.length));

    // done buttons
    sections.forEach(sec => {
      const h2 = sec.querySelector("h2");
      if (!h2) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "done-btn";
      btn.dataset.target = sec.id;
      h2.appendChild(btn);
      btn.addEventListener("click", () => {
        done.has(sec.id) ? done.delete(sec.id) : done.add(sec.id);
        store.set(doneKey, JSON.stringify([...done]));
        refresh();
      });
    });

    // TOC markup
    let html = "";
    let lastLevel = null;
    sections.forEach(sec => {
      const lvl = sec.dataset.level || "basic";
      if (lvl !== lastLevel) {
        const L = LEVELS[lvl] || LEVELS.basic;
        html += `<div class="toc-group ${lvl}"><i class="bi ${L.icon}"></i>${L.label}</div>`;
        lastLevel = lvl;
      }
      const title = sec.dataset.title || (sec.querySelector("h2")?.childNodes[1]?.textContent || sec.id).trim();
      html += `<a href="#${sec.id}" data-id="${sec.id}"><span>${title}</span><i class="bi bi-check-circle-fill done-mark"></i></a>`;
    });

    const progressHTML = `
      <div class="progress-wrap mb-3">
        <div class="d-flex justify-content-between small mb-2">
          <span class="fw-semibold"><i class="bi bi-trophy me-1" style="color:var(--accent)"></i>Your progress</span>
          <span class="prog-text text-body-secondary"></span>
        </div>
        <div class="progress"><div class="progress-bar" style="width:0%"></div></div>
      </div>`;

    document.querySelectorAll("[data-toc]").forEach(host => {
      host.innerHTML = progressHTML + `<div class="toc-title mb-1">On this page</div>` + html;
    });

    // close offcanvas on click
    document.querySelectorAll("#tocOffcanvas a").forEach(a => a.addEventListener("click", () => {
      const oc = window.bootstrap && bootstrap.Offcanvas.getInstance(document.getElementById("tocOffcanvas"));
      if (oc) oc.hide();
    }));

    function refresh() {
      const pct = Math.round((done.size / sections.length) * 100);
      document.querySelectorAll(".progress-wrap .progress-bar").forEach(b => (b.style.width = pct + "%"));
      document.querySelectorAll(".prog-text").forEach(t => (t.textContent = `${done.size}/${sections.length} · ${pct}%`));
      document.querySelectorAll(".done-btn").forEach(b => {
        const isDone = done.has(b.dataset.target);
        b.classList.toggle("done", isDone);
        b.innerHTML = isDone ? '<i class="bi bi-check2-circle"></i> Done' : '<i class="bi bi-circle"></i> Mark done';
      });
      document.querySelectorAll(".toc a[data-id]").forEach(a => a.classList.toggle("is-done", done.has(a.dataset.id)));
    }
    refresh();

    // scrollspy
    const links = id => document.querySelectorAll(`.toc a[data-id="${id}"]`);
    const visible = new Map();
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => visible.set(e.target.id, e.isIntersecting ? e.boundingClientRect.top : null));
      const active = sections.find(s => visible.get(s.id) != null);
      if (!active) return;
      document.querySelectorAll(".toc a.active").forEach(a => a.classList.remove("active"));
      links(active.id).forEach(a => {
        a.classList.add("active");
        const toc = a.closest(".toc");
        if (toc && toc.offsetParent) {
          const r = a.getBoundingClientRect(), tr = toc.getBoundingClientRect();
          if (r.top < tr.top || r.bottom > tr.bottom) toc.scrollTop += r.top - tr.top - tr.height / 2;
        }
      });
    }, { rootMargin: "-80px 0px -55% 0px" });
    sections.forEach(s => io.observe(s));
  }

  /* ---------- quizzes ----------
     <div class="quiz" data-answer="b" data-explain="...">
       <p class="q">Question?</p>
       <button data-opt="a">...</button> ...
     </div>  */
  function initQuizzes() {
    document.querySelectorAll(".quiz").forEach(q => {
      const fb = document.createElement("div");
      fb.className = "quiz-feedback";
      q.appendChild(fb);
      q.querySelectorAll("button[data-opt]").forEach(btn => {
        btn.type = "button";
        btn.addEventListener("click", () => {
          const ok = btn.dataset.opt === q.dataset.answer;
          q.querySelectorAll("button[data-opt]").forEach(b => {
            b.classList.remove("right", "wrong");
            if (b.dataset.opt === q.dataset.answer && ok) b.classList.add("right");
          });
          btn.classList.add(ok ? "right" : "wrong");
          fb.className = "quiz-feedback show " + (ok ? "ok" : "bad");
          fb.innerHTML = ok
            ? `<i class="bi bi-check-circle-fill"></i> Correct! ${q.dataset.explain || ""}`
            : `<i class="bi bi-x-circle-fill"></i> Not quite — try again.`;
        });
      });
    });
  }

  /* ---------- home page progress ---------- */
  function homeProgress() {
    document.querySelectorAll("[data-progress-for]").forEach(el => {
      const id = el.dataset.progressFor;
      const total = parseInt(store.get("fsn-total-" + id) || "0", 10);
      const done = readJSON("fsn-done-" + id, []).length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      const bar = el.querySelector(".progress-bar");
      const txt = el.querySelector(".p-text");
      if (bar) bar.style.width = pct + "%";
      if (txt) txt.textContent = total ? `${done}/${total} sections · ${pct}%` : "Not started";
    });
  }

  /* ---------- back to top ---------- */
  function backToTop() {
    const btn = document.createElement("button");
    btn.className = "to-top";
    btn.type = "button";
    btn.setAttribute("aria-label", "Back to top");
    btn.innerHTML = '<i class="bi bi-arrow-up"></i>';
    btn.addEventListener("click", () => window.scrollTo({ top: 0 }));
    document.body.appendChild(btn);
    const onScroll = () => btn.classList.toggle("show", window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderNav();
    renderFooter();
    renderCode();
    buildTOC();
    initQuizzes();
    homeProgress();
    backToTop();
    // enable bootstrap tooltips
    if (window.bootstrap) document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el));
  });
})();
