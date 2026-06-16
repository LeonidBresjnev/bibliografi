import createLucideElement from "lucide/dist/esm/createElement.mjs";
import BookOpenText from "lucide/dist/esm/icons/book-open-text.mjs";
import ChevronDown from "lucide/dist/esm/icons/chevron-down.mjs";
import CircleAlert from "lucide/dist/esm/icons/circle-alert.mjs";
import FileText from "lucide/dist/esm/icons/file-text.mjs";
import GraduationCap from "lucide/dist/esm/icons/graduation-cap.mjs";
import Hash from "lucide/dist/esm/icons/hash.mjs";
import Layers from "lucide/dist/esm/icons/layers.mjs";
import Library from "lucide/dist/esm/icons/library.mjs";
import ScrollText from "lucide/dist/esm/icons/scroll-text.mjs";
import "./styles.css";

const app = document.querySelector("#app");

const BIBTEX_LOGO = String.raw`\(\mathrm{Bib}\TeX\)`;
const pendingMathElements = new Set();
const LUCIDE_ICONS = {
  "book-open-text": BookOpenText,
  "chevron-down": ChevronDown,
  "circle-alert": CircleAlert,
  "file-text": FileText,
  "graduation-cap": GraduationCap,
  hash: Hash,
  layers: Layers,
  library: Library,
  "scroll-text": ScrollText,
};
const SHELL_CLASS =
  "mx-auto w-[min(1120px,calc(100%_-_24px))] md:w-[min(1120px,calc(100%_-_32px))]";
const EYEBROW_CLASS =
  "mb-2.5 inline-flex items-center gap-2 text-[0.78rem] font-[760] uppercase tracking-normal text-[#7a332f]";
const H1_CLASS =
  "mb-3 max-w-[760px] text-[2.15rem] font-bold leading-none tracking-normal text-[#0e1714] md:text-[2.8rem]";
const H2_CLASS =
  "mb-2 text-[1.2rem] font-bold leading-[1.2] tracking-normal text-[#0e1714]";
const MUTED_TEXT_CLASS = "mb-0 text-[#5d635f]";
const ICON_BADGE_CLASS =
  "mb-5 flex size-12 items-center justify-center rounded-md border border-[#d8d2c2] bg-white text-[#7a332f] shadow-sm";
const icon = (name, className = "h-4 w-4 shrink-0") =>
  `<i data-lucide="${name}" class="${className}" aria-hidden="true"></i>`;

const renderIcons = (root = app) => {
  root.querySelectorAll("i[data-lucide]").forEach((element) => {
    const name = element.getAttribute("data-lucide");
    const iconNode = LUCIDE_ICONS[name];

    if (!iconNode) {
      return;
    }

    const svg = createLucideElement(iconNode, {
      "aria-hidden": element.getAttribute("aria-hidden") ?? "true",
      class: `lucide lucide-${name} ${element.getAttribute("class") ?? ""}`.trim(),
      "data-lucide": name,
      "stroke-width": 1.8,
    });

    element.replaceWith(svg);
  });
};

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

const typesetMath = (element = app) => {
  if (!window.MathJax?.typesetPromise) {
    pendingMathElements.add(element);
    return;
  }

  window.MathJax.typesetClear?.([element]);
  window.MathJax.typesetPromise([element]).catch(() => {});
};

window.addEventListener("load", () => {
  const elements = [...pendingMathElements];
  pendingMathElements.clear();
  elements.forEach((element) => typesetMath(element));
});

const renderMissingBibliography = () => {
  app.innerHTML = `
    <main class="${SHELL_CLASS} grid min-h-screen content-center py-12">
      <div class="${ICON_BADGE_CLASS}">${icon("circle-alert", "h-6 w-6")}</div>
      <p class="${EYEBROW_CLASS}">
        ${icon("library")}
        <span>Bibliography</span>
      </p>
      <h1 class="${H1_CLASS} max-w-[700px]">Waiting for generated ${BIBTEX_LOGO} output</h1>
      <div class="flex max-w-[720px] items-start gap-2.5 text-[#4c5752]">
        ${icon("file-text", "mt-1 h-4 w-4 shrink-0 text-[#8c8f78]")}
        <p class="mb-0 leading-[1.6]">
          The web page is ready, but <code>public/bibliography.json</code> is generated
          by the GitHub Actions workflow after ${BIBTEX_LOGO} and Pandoc render the journal styles.
        </p>
      </div>
    </main>
  `;
  renderIcons();
  typesetMath(app);
};

const renderBibliography = (data) => {
  let selectedStyle = findInitialStyle(data.styles);

  app.innerHTML = `
    <header class="border-b border-[#d8d2c2] bg-[#fbfaf7]">
      <div class="${SHELL_CLASS} py-8 md:pb-[34px] md:pt-[42px]">
        <div class="${ICON_BADGE_CLASS}">${icon("book-open-text", "h-6 w-6")}</div>
        <p class="${EYEBROW_CLASS}">
          ${icon("library")}
          <span>Bibliography</span>
        </p>
        <h1 class="${H1_CLASS}">Bibliography of Jacob Simonsen</h1>
        <p class="${MUTED_TEXT_CLASS} inline-flex items-center gap-2">
          ${icon("graduation-cap", "h-4 w-4 shrink-0 text-[#8c8f78]")}
          <span>Statistician, M.Sc. and PhD</span>
        </p>
      </div>
    </header>

    <main class="${SHELL_CLASS} pb-14 pt-7">
      <section class="border-b border-[#d8d2c2] pb-6" aria-labelledby="style-heading">
        <div class="grid items-start gap-6 md:flex md:items-end md:justify-between">
          <div>
            <h2 id="style-heading" class="${H2_CLASS} inline-flex items-center gap-2">
              ${icon("layers", "h-5 w-5 shrink-0 text-[#7a332f]")}
              <span>Citation style</span>
            </h2>
            <p class="${MUTED_TEXT_CLASS}">Choose one of the available ${BIBTEX_LOGO} styles.</p>
          </div>
          <label class="grid gap-1.5 text-[0.86rem] font-bold text-[#44504a] md:min-w-[260px]">
            <span class="inline-flex items-center gap-2">
              ${icon("scroll-text", "h-4 w-4 shrink-0 text-[#8c8f78]")}
              <span>Style</span>
            </span>
            <span class="relative">
              <select
                class="min-h-[42px] w-full appearance-none rounded-md border border-[#b8c6bb] bg-white px-3 pr-10 text-[#17211d] outline-none focus:border-[#7a332f] focus:ring-2 focus:ring-[#7a332f]/20"
                data-style-select
              >
                ${data.styles
                  .map(
                    (style) =>
                      `<option value="${escapeHtml(style.id)}">${escapeHtml(style.label)}</option>`,
                  )
                  .join("")}
              </select>
              ${icon(
                "chevron-down",
                "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a332f]",
              )}
            </span>
          </label>
        </div>
      </section>

      <section class="pt-[30px]" aria-live="polite">
        <div class="mb-[18px] grid items-start gap-5 md:flex md:items-end md:justify-between">
          <div>
            <p class="${EYEBROW_CLASS}">
              ${icon("scroll-text")}
              <span>Selected style</span>
            </p>
            <h2 class="${H2_CLASS} inline-flex items-center gap-2">
              ${icon("layers", "h-5 w-5 shrink-0 text-[#7a332f]")}
              <span data-selected-label></span>
            </h2>
            <div class="flex items-start gap-2.5 text-[#5d635f]">
              ${icon("file-text", "mt-1 h-4 w-4 shrink-0 text-[#8c8f78]")}
              <p class="mb-0 leading-[1.6]" data-generated-line></p>
            </div>
          </div>
          <p class="m-0 inline-flex items-center gap-2 font-[760] text-[#7a332f]">
            ${icon("hash", "h-4 w-4 shrink-0")}
            <span><span data-entry-count></span> entries</span>
          </p>
        </div>
        <div class="bibliography-body font-serif text-[1.03rem] leading-[1.65]" data-bibliography-body></div>
      </section>
    </main>
  `;
  renderIcons();

  const selectedLabel = app.querySelector("[data-selected-label]");
  const generatedLine = app.querySelector("[data-generated-line]");
  const entryCount = app.querySelector("[data-entry-count]");
  const bibliographyBody = app.querySelector("[data-bibliography-body]");
  const styleSelect = app.querySelector("[data-style-select]");

  const setSelectedStyle = (style, updateHash = true) => {
    selectedStyle = style;
    selectedLabel.textContent = style.label;
    generatedLine.innerHTML = `Generated with ${BIBTEX_LOGO} from <code>${escapeHtml(
      data.source ?? "bibliography source",
    )}</code> using the ${escapeHtml(style.label)} style.`;
    entryCount.textContent = style.entryCount;
    bibliographyBody.innerHTML = style.html;
    styleSelect.value = style.id;
    typesetMath(app);

    if (updateHash) {
      history.replaceState(null, "", `#${style.anchor}`);
    }
  };

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
