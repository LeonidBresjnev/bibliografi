import "./styles.css";

const app = document.querySelector("#app");

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const normalizeHash = () => window.location.hash.replace(/^#/, "");

const findInitialStyle = (styles) => {
  const hash = normalizeHash();
  return styles.find((style) => style.anchor === hash || style.id === hash) ?? styles[0];
};

const renderMissingBibliography = () => {
  app.innerHTML = `
    <main class="empty-state">
      <p class="eyebrow">Bibliography</p>
      <h1>Waiting for generated BibTeX output</h1>
      <p>
        The web page is ready, but <code>public/bibliography.json</code> is generated
        by the GitHub Actions workflow after BibTeX and Pandoc render the journal styles.
      </p>
    </main>
  `;
};

const renderBibliography = (data) => {
  let selectedStyle = findInitialStyle(data.styles);

  app.innerHTML = `
    <header class="site-header">
      <div class="header-inner">
        <p class="eyebrow">Bibliography</p>
        <h1>Mine artikler</h1>
        <p class="source-line">
          Generated from <code>${escapeHtml(data.source)}</code>
        </p>
      </div>
    </header>

    <main class="page-shell">
      <section class="style-panel" aria-labelledby="style-heading">
        <div class="style-panel-header">
          <div>
            <h2 id="style-heading">Citation style</h2>
            <p><span data-style-count></span> styles generated with BibTeX</p>
          </div>
          <label class="style-select-label">
            <span>Style</span>
            <select data-style-select>
              ${data.styles
                .map(
                  (style) =>
                    `<option value="${escapeHtml(style.id)}">${escapeHtml(style.label)}</option>`,
                )
                .join("")}
            </select>
          </label>
        </div>

        <div class="style-tabs" role="tablist" aria-label="Citation style">
          ${data.styles
            .map(
              (style) => `
                <button class="style-button" type="button" role="tab" data-style-id="${escapeHtml(
                  style.id,
                )}">
                  ${escapeHtml(style.label)}
                </button>
              `,
            )
            .join("")}
        </div>
      </section>

      <section class="bibliography-section" aria-live="polite">
        <div class="bibliography-heading">
          <div>
            <p class="eyebrow">Selected style</p>
            <h2 data-selected-label></h2>
          </div>
          <p class="entry-count"><span data-entry-count></span> entries</p>
        </div>
        <div class="bibliography-body" data-bibliography-body></div>
      </section>
    </main>
  `;

  const styleCount = app.querySelector("[data-style-count]");
  const selectedLabel = app.querySelector("[data-selected-label]");
  const entryCount = app.querySelector("[data-entry-count]");
  const bibliographyBody = app.querySelector("[data-bibliography-body]");
  const styleButtons = [...app.querySelectorAll("[data-style-id]")];
  const styleSelect = app.querySelector("[data-style-select]");

  styleCount.textContent = data.styles.length;

  const setSelectedStyle = (style, updateHash = true) => {
    selectedStyle = style;
    selectedLabel.textContent = style.label;
    entryCount.textContent = style.entryCount;
    bibliographyBody.innerHTML = style.html;
    styleSelect.value = style.id;

    styleButtons.forEach((button) => {
      const isSelected = button.dataset.styleId === style.id;
      button.classList.toggle("is-selected", isSelected);
      button.setAttribute("aria-selected", String(isSelected));
      button.tabIndex = isSelected ? 0 : -1;
    });

    if (updateHash) {
      history.replaceState(null, "", `#${style.anchor}`);
    }
  };

  styleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const style = data.styles.find((item) => item.id === button.dataset.styleId);
      if (style) {
        setSelectedStyle(style);
      }
    });
  });

  styleSelect.addEventListener("change", () => {
    const style = data.styles.find((item) => item.id === styleSelect.value);
    if (style) {
      setSelectedStyle(style);
    }
  });

  window.addEventListener("hashchange", () => {
    const style = findInitialStyle(data.styles);
    setSelectedStyle(style, false);
  });

  setSelectedStyle(selectedStyle, Boolean(normalizeHash()));
};

const loadBibliography = async () => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}bibliography.json`, {
      cache: "no-cache",
    });

    if (!response.ok) {
      throw new Error(`Unable to load bibliography.json: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.styles) || data.styles.length === 0) {
      throw new Error("bibliography.json does not contain any styles");
    }

    renderBibliography(data);
  } catch {
    renderMissingBibliography();
  }
};

loadBibliography();
