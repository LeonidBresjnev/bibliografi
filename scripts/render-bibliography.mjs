import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const BIBTEX_LOGO = "$\\mathrm{Bib}\\TeX$";

const usage = () => {
  throw new Error("Usage: node scripts/render-bibliography.mjs <readme|site>");
};

const mode = process.argv[2] ?? usage();
const workdir = process.env.WORKDIR;
const bibFile = process.env.BIB_FILE;

if (!workdir || !bibFile) {
  throw new Error("WORKDIR and BIB_FILE must be set.");
}

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const readBalanced = (text, start, opener, closer) => {
  let level = 1;
  let index = start;

  while (index < text.length && level > 0) {
    if (text[index] === opener) {
      level += 1;
    } else if (text[index] === closer) {
      level -= 1;
    }
    index += 1;
  }

  return [text.slice(start, index - 1), index];
};

const readFieldValue = (text, start) => {
  let index = start;
  while (index < text.length && /\s/.test(text[index])) {
    index += 1;
  }

  if (index >= text.length) {
    return "";
  }

  if (text[index] === "{") {
    const [value] = readBalanced(text, index + 1, "{", "}");
    return value;
  }

  if (text[index] === '"') {
    let end = index + 1;
    let escaped = false;

    while (end < text.length) {
      if (text[end] === '"' && !escaped) {
        break;
      }
      escaped = text[end] === "\\" && !escaped;
      if (text[end] !== "\\") {
        escaped = false;
      }
      end += 1;
    }

    return text.slice(index + 1, end);
  }

  let end = index;
  while (end < text.length && ![",", "\n"].includes(text[end])) {
    end += 1;
  }
  return text.slice(index, end);
};

const extractDoiMap = (bibText) => {
  const dois = new Map();
  const entryStart = /@\w+\s*\{\s*([^,\s]+)\s*,/g;

  for (const match of bibText.matchAll(entryStart)) {
    const key = match[1];
    const [body] = readBalanced(bibText, match.index + match[0].length, "{", "}");
    const doiField = /^\s*doi\s*=/im.exec(body);

    if (doiField) {
      const doi = readFieldValue(body, doiField.index + doiField[0].length).replace(/\s+/g, "");
      if (doi) {
        dois.set(key, doi);
      }
    }
  }

  return dois;
};

const readStyles = () =>
  readFileSync(join(workdir, "styles.tsv"), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const [id, label, url] = line.split("\t");
      return { id, label, url };
    });

const splitEntries = (markdown) =>
  markdown
    .trim()
    .split(/\n\s*\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const markdownWithDoiLinks = (styleId, doiMap) => {
  const bbl = readFileSync(join(workdir, `${styleId}.bbl`), "utf8");
  const citationKeys = [...bbl.matchAll(/\\bibitem(?:\[[^\]]*\])?\{([^}]+)\}/g)].map(
    (match) => match[1],
  );
  const markdownPath = join(workdir, `${styleId}.md`);
  const entries = splitEntries(readFileSync(markdownPath, "utf8"));

  if (citationKeys.length !== entries.length) {
    throw new Error(
      `Expected ${citationKeys.length} rendered bibliography entries for ${styleId}, found ${entries.length}.`,
    );
  }

  return entries
    .map((entry, index) => {
      const doi = doiMap.get(citationKeys[index]);
      if (!doi) {
        return entry;
      }

      const safeDoi = escapeHtml(doi);
      return `${entry}\n<br/>DOI: <a href="https://doi.org/${safeDoi}">${safeDoi}</a>`;
    })
    .join("\n\n");
};

const replaceReadmeSection = (section) => {
  const readmePath = "README.md";

  if (!existsSync(readmePath)) {
    writeFileSync(readmePath, `# Bibliography\n\n## Publications\n\n${section}\n`, "utf8");
    return;
  }

  const readme = readFileSync(readmePath, "utf8");
  const startMarker = "<!-- bibliography:start -->";
  const endMarker = "<!-- bibliography:end -->";

  if (readme.includes(startMarker) && readme.includes(endMarker)) {
    writeFileSync(
      readmePath,
      readme.replace(
        /<!-- bibliography:start -->[\s\S]*?<!-- bibliography:end -->/,
        section.trimEnd(),
      ),
      "utf8",
    );
    return;
  }

  writeFileSync(readmePath, `${readme.trimEnd()}\n\n## Publications\n\n${section}\n`, "utf8");
};

const runPandoc = (styleId) => {
  const result = spawnSync(
    "pandoc",
    ["--from=gfm", "--to=html", join(workdir, `${styleId}.md`), "-o", join(workdir, `${styleId}.html`)],
    { stdio: "inherit" },
  );

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Pandoc failed for ${styleId} with exit code ${result.status}.`);
  }
};

const doiMap = extractDoiMap(readFileSync(bibFile, "utf8"));

if (mode === "readme") {
  const styleId = process.env.STYLE_ID ?? "biom";
  const style = readStyles().find((item) => item.id === styleId);

  if (!style) {
    throw new Error(`Could not find ${styleId} in bibliography-styles.tsv.`);
  }

  const bibliography = markdownWithDoiLinks(styleId, doiMap);
  const section = [
    "<!-- bibliography:start -->",
    `_Generated with ${BIBTEX_LOGO} from \`${bibFile}\` using the ${style.label} style._`,
    "",
    bibliography,
    "<!-- bibliography:end -->",
    "",
  ].join("\n");

  replaceReadmeSection(section);
} else if (mode === "site") {
  const styles = readStyles().map((style) => {
    const markdown = markdownWithDoiLinks(style.id, doiMap);
    writeFileSync(join(workdir, `${style.id}.md`), `${markdown}\n`, "utf8");
    runPandoc(style.id);

    const html = readFileSync(join(workdir, `${style.id}.html`), "utf8").trim();
    return {
      id: style.id,
      anchor: `bibliography-style-${style.id}`,
      label: style.label,
      entryCount: splitEntries(markdown).length,
      html,
    };
  });

  mkdirSync("public", { recursive: true });
  writeFileSync(
    "public/bibliography.json",
    `${JSON.stringify({ source: bibFile, styles }, null, 2)}\n`,
    "utf8",
  );
} else {
  usage();
}
