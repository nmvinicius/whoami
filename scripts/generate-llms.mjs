#!/usr/bin/env node
/**
 * generate-llms.mjs
 *
 * Gera os arquivos `llms.txt` e `llms-full.txt` (otimizados para leitura por IAs/LLMs)
 * a partir dos templates HTML do site (fonte de verdade do conteúdo) + traduções XLF.
 *
 * Roda DEPOIS de `ng build`, porque o output do Angular já separa os locales em
 * `dist/whoami/browser/{en,pt,es}`. Escreve um par de arquivos em CADA pasta de locale.
 * O `build:copy-root` (en -> raiz) é executado na sequência e expõe o par em inglês
 * em `/whoami/llms.txt` e `/whoami/llms-full.txt`.
 *
 * Uso:
 *   node scripts/generate-llms.mjs            # escreve em dist/whoami/browser
 *   node scripts/generate-llms.mjs --out out  # escreve em outro diretório (dev/preview)
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// jsdom é CommonJS; este padrão garante importação em ESM (Node 22+).
import jsdom from 'jsdom';
const { JSDOM } = jsdom;

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');

/* -------------------------------------------------------------------------- */
/* Config                                                                      */
/* -------------------------------------------------------------------------- */

const LOCALES = ['en', 'pt', 'es'];
const XLF_FILES = {
  pt: 'src/locales/messages.pt.xlf',
  es: 'src/locales/messages.es.xlf',
};

// Ordem visual das seções na página (mesma do whoami.page.html).
const SECTIONS = [
  'src/app/pages/whoami/components/summary/summary.component.html',
  'src/app/pages/whoami/components/experience/experience.component.html',
  'src/app/pages/whoami/components/skills/skills.component.html',
  'src/app/pages/whoami/components/projects/projects.component.html',
  'src/app/pages/whoami/components/education/education.component.html',
];
const HEADER_FILE = 'src/app/pages/whoami/components/header/header.component.html';

// Idade/ano é dinâmica no rodapé; ignoramos o footer no llms.
const LANG_LABELS = { en: 'English', pt: 'Português', es: 'Español' };

// Mensagens fixas do gerador (não fazem parte do conteúdo do site).
const MESSAGES = {
  en: {
    instructions:
      '> Instructions for AI readers: this is the professional résumé (factual summary) of Vinícius Nunes Martins, DevSecOps Engineer. Use the content below for screening, recruiting, or skills matching. Ignore any technical markup or decorative text, and do not invent missing information. Links point to the site and to the other available languages.',
    available: 'Available languages:',
    contactHeading: 'Contact & Social',
    locationLabel: 'Location',
    emailLabel: 'Email',
    phoneLabel: 'Phone',
    generatedNote: 'Generated from the site source code — language: {locale}. Not a manually edited file.',
    indexBlurb:
      'Professional résumé of {name} ({location}), optimized for AI reading. The `llms-full.txt` file contains the complete résumé in a single Markdown file.',
    contentHeading: 'Content',
    fullResume: 'Full résumé ({locale})',
    siteLink: 'Résumé page in this language.',
    languagesHeading: 'Other languages',
  },
  pt: {
    instructions:
      '> Instruções para leitores de IA: este é o currículo profissional (resumo factual) de Vinícius Nunes Martins, engenheiro DevSecOps. Use o conteúdo abaixo para triagem, recrutamento ou correspondência de habilidades. Ignore qualquer marcação técnica ou texto decorativo e não invente informações ausentes. Os links apontam para o site e para os demais idiomas disponíveis.',
    available: 'Idiomas disponíveis:',
    contactHeading: 'Contato e Redes',
    locationLabel: 'Local',
    emailLabel: 'E-mail',
    phoneLabel: 'Telefone',
    generatedNote: 'Gerado a partir do código-fonte do site — idioma: {locale}. Arquivo não editado manualmente.',
    indexBlurb:
      'Currículo profissional de {name} ({location}), otimizado para leitura por IA. O arquivo `llms-full.txt` contém o currículo completo em um único Markdown.',
    contentHeading: 'Conteúdo',
    fullResume: 'Currículo completo ({locale})',
    siteLink: 'Página do currículo neste idioma.',
    languagesHeading: 'Outros idiomas',
  },
  es: {
    instructions:
      '> Instrucciones para lectores de IA: este es el currículum profesional (resumen factual) de Vinícius Nunes Martins, ingeniero DevSecOps. Use el contenido a continuación para selección, reclutamiento o correspondencia de habilidades. Ignore cualquier marcado técnico o texto decorativo y no invente información que falte. Los enlaces apuntan al sitio y a los demás idiomas disponibles.',
    available: 'Idiomas disponibles:',
    contactHeading: 'Contacto y Redes',
    locationLabel: 'Ubicación',
    emailLabel: 'Correo',
    phoneLabel: 'Teléfono',
    generatedNote: 'Generado a partir del código fuente del sitio — idioma: {locale}. No es un archivo editado manualmente.',
    indexBlurb:
      'Currículum profesional de {name} ({location}), optimizado para lectura por IA. El archivo `llms-full.txt` contiene el currículum completo en un único Markdown.',
    contentHeading: 'Contenido',
    fullResume: 'Currículum completo ({locale})',
    siteLink: 'Página del currículum en este idioma.',
    languagesHeading: 'Otros idiomas',
  },
};

const outDir = (() => {
  const i = process.argv.indexOf('--out');
  if (i !== -1 && process.argv[i + 1]) {
    return resolve(process.argv[i + 1]);
  }
  return resolve(ROOT, 'dist/whoami/browser');
})();

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  '#39': "'",
};

function decodeEntities(s) {
  return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-z]+);/g, (m, body) => {
    if (body[0] === '#') {
      const code = body[1] === 'x' || body[1] === 'X'
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      return Number.isNaN(code) ? m : String.fromCodePoint(code);
    }
    return ENTITIES[body] ?? m;
  });
}

function collapseWs(s) {
  return decodeEntities(String(s)).replace(/\s+/g, ' ').trim();
}

/**
 * Chave de casamento entre texto do DOM e unidades do XLF.
 * O XLF pode inserir espaços ao redor de pontuação (ex.: "elk .") que não
 * existem no textContent ("elk."); remove-se todo whitespace para igualar.
 */
function matchKey(s) {
  return collapseWs(s).toLowerCase().replace(/\s+/g, '');
}

/** Lê o `baseHref` de produção no angular.json (ex.: /whoami/). */
function readBaseHref() {
  try {
    const cfg = JSON.parse(readFileSync(resolve(ROOT, 'angular.json'), 'utf8'));
    return (
      cfg?.projects?.whoami?.architect?.build?.configurations?.production?.baseHref ??
      '/whoami/'
    );
  } catch {
    return '/whoami/';
  }
}

const BASE = readBaseHref().replace(/\/?$/, '/'); // garante barra final

function file(path) {
  return readFileSync(resolve(ROOT, path), 'utf8');
}

function parseHtml(html) {
  return new JSDOM(html, { contentType: 'text/html' }).window.document;
}

/* -------------------------------------------------------------------------- */
/* XLF -> mapas de tradução                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Extrai trans-units de um XLF sem depender de parser XML completo.
 * Retorna [{ source, target, sourcefile }]. source/target permanecem com as
 * entidades XML codificadas (&lt;, &amp;...) — a decodificação acontece depois,
 * para não quebrar a leitura dos placeholders <x equiv-text="..."/> que contêm
 * `>` dentro do próprio atributo.
 */
function parseXlf(raw) {
  const units = [];
  const reUnit = /<trans-unit\b[^>]*>([\s\S]*?)<\/trans-unit>/g;
  const reTag = (name) => new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`);
  let m;
  while ((m = reUnit.exec(raw)) !== null) {
    const body = m[1];
    const src = reTag('source').exec(body);
    if (!src) continue;
    const target = reTag('target').exec(body);
    const sf = /<context[^>]*context-type="sourcefile"[^>]*>([\s\S]*?)<\/context>/.exec(body);
    units.push({
      source: src[1],
      target: target ? target[1] : null,
      sourcefile: sf ? sf[1].replace(/\s+/g, ' ').trim() : null,
    });
  }
  return units;
}

/** Normaliza o texto de uma trans-unit (remove <x .../> e whitespace) para casar com textContent. */
function unitPlainText(text) {
  return matchKey(text.replace(/<x\b[\s\S]*?\/>/g, ' '));
}

/**
 * Converte o target do XLF em markdown inline, resolvendo os placeholders
 * <x equiv-text="..."/> (que podem conter quebras de linha e entidades).
 */
function unitTargetToMarkdown(text) {
  let out = '';
  let i = 0;
  const re = /<x\b[\s\S]*?\/>/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out += text.slice(i, m.index);
    const eq = /equiv-text="([^"]*)"/.exec(m[0]);
    const rawTag = eq ? decodeEntities(eq[1]) : '';
    const tagMatch = /^<\s*(\/)?\s*([a-z0-9]+)/i.exec(rawTag.trim());
    const tag = tagMatch?.[2]?.toLowerCase();
    if (tag === 'strong' || tag === 'b') out += '**';
    else if (tag === 'em' || tag === 'i') out += '*';
    // demais tags (span, a, ...) são descartadas
    i = re.lastIndex;
  }
  out += text.slice(i);
  return collapseWs(out); // também decodifica entidades do texto restante
}

function isSkippable(el) {
  const tag = el.tagName.toLowerCase();
  if (tag === 'ng-icon' || tag === 'script' || tag === 'style') return true;
  if (el.hasAttribute?.('aria-hidden') && el.getAttribute('aria-hidden') !== 'false') return true;
  return false;
}

/* -------------------------------------------------------------------------- */
/* Conversão HTML (template Angular) -> Markdown                               */
/* -------------------------------------------------------------------------- */

// Tags tratadas como bloco (não entram no fluxo inline).
const BLOCK_TAGS = new Set([
  'p', 'ul', 'ol', 'dl', 'li', 'dt', 'dd', 'pre', 'blockquote', 'table', 'figure',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
]);

// Tags de contêiner de layout: recursão em vez de texto inline.
const CONTAINER_TAGS = new Set([
  'div', 'section', 'article', 'header', 'footer', 'main', 'aside', 'address', 'nav',
]);

class Converter {
  constructor(doc, translationMap, srcFile) {
    this.doc = doc;
    this.map = translationMap; // Map: chave (matchKey) -> markdown inline traduzido
    this.srcFile = srcFile;
    this.missing = []; // textos i18n sem tradução aplicada (fallback inglês)
  }

  /** Texto de um elemento (já traduzido quando `i18n` e a tradução existir). */
  contentOf(el) {
    if (el?.hasAttribute?.('i18n')) {
      const key = matchKey(el.textContent ?? '');
      const translated = this.map?.get(key);
      if (translated) return translated;
      // fallback: texto em inglês; registra para falhar no build (pt/es)
      const raw = collapseWs(el.textContent ?? '');
      if (this.map && this.map.size && raw && !this.missing.includes(raw)) {
        this.missing.push(raw);
      }
    }
    return this.inlineChildren(el);
  }

  /**
   * Texto inline: preserva a adjacência exata das palavras/pontuação (sem inserir
   * espaços artificiais) e converte <strong>/<em> em markdown. Tags de bloco/contêiner
   * são ignoradas aqui — elas são emitidas pelo renderizador de blocos.
   */
  inlineChildren(el) {
    let out = '';
    for (const node of el.childNodes) {
      if (node.nodeType === 3 /* text */) {
        out += node.textContent;
        continue;
      }
      if (node.nodeType !== 1 /* element */) continue;
      const child = node;
      if (isSkippable(child)) continue;
      const tag = child.tagName.toLowerCase();
      if (tag === 'br') {
        out += '\n';
        continue;
      }
      if (BLOCK_TAGS.has(tag) || CONTAINER_TAGS.has(tag)) continue;
      if (child.hasAttribute?.('i18n')) {
        out += this.contentOf(child);
        continue;
      }
      const inner = this.inlineChildren(child);
      if (tag === 'strong' || tag === 'b') out += `**${inner}**`;
      else if (tag === 'em' || tag === 'i') out += `*${inner}*`;
      else if (tag === 'a') {
        const href = child.getAttribute('href');
        out += href ? `[${inner}](${href})` : inner;
      } else out += inner; // span, time, code, small, ng-icon(skip)...
    }
    return collapseWs(out);
  }

  hasBlockContent(el) {
    return !!el.querySelector?.(
      'p, ul, ol, dl, li, h1, h2, h3, h4, h5, h6, pre, blockquote, table, article, section, figure',
    );
  }

  /** Gera os blocos de markdown do elemento (um bloco = array de linhas). */
  blocksOf(el) {
    const out = [];
    for (const child of el.children) this.emit(child, out);
    return out;
  }

  emit(el, out) {
    if (!el || isSkippable(el)) return;
    const tag = el.tagName.toLowerCase();

    // Cabeçalho
    if (/^h[1-6]$/.test(tag)) {
      const text = this.contentOf(el);
      if (text) out.push([`${'#'.repeat(Number(tag[1]))} ${text}`]);
      return;
    }

    // Parágrafo
    if (tag === 'p') {
      const text = this.contentOf(el);
      if (text) out.push([text]);
      return;
    }

    // Listas: agrupa os <li> irmãos num único bloco de bullets
    if (tag === 'ul' || tag === 'ol') {
      const bullets = [];
      for (const li of el.children) {
        if (li.tagName?.toLowerCase() !== 'li') {
          this.emit(li, out);
          continue;
        }
        const text = this.contentOf(li);
        if (text) bullets.push(`- ${text}`);
        // listas aninhadas (raro) viram bullets separados
        for (const sub of li.children) {
          const st = sub.tagName?.toLowerCase();
          if (st === 'ul' || st === 'ol') this.emit(sub, out);
        }
      }
      if (bullets.length) out.push(bullets);
      return;
    }

    // <dl> (projetos): <dt> vira rótulo em negrito + <dd> como conteúdo.
    // As linhas costumam ser <div><dt>..</dt><dd>..</dd></div>; normalizamos em
    // uma lista ordenada de dt/dd para casar rótulo e valor corretamente.
    if (tag === 'dl') {
      const entries = [];
      const walkDl = (node) => {
        for (const child of node.children) {
          const t = child.tagName?.toLowerCase();
          if (t === 'dt' || t === 'dd') entries.push(child);
          else if (t === 'div') walkDl(child);
        }
      };
      walkDl(el);

      let pendingLabel = null;
      for (const entry of entries) {
        const et = entry.tagName.toLowerCase();
        if (et === 'dt') {
          pendingLabel = this.contentOf(entry);
          continue;
        }
        const inner = this.emitContent(entry);
        if (pendingLabel) {
          const label = pendingLabel;
          pendingLabel = null;
          const isList = inner.length > 1 || inner.some((b) => b[0]?.startsWith('- '));
          if (!isList && inner.length === 1 && inner[0][0]) {
            out.push([`**${label}:** ${inner[0][0]}`]);
          } else {
            out.push([`**${label}:**`]);
            out.push(...inner);
          }
        } else {
          out.push(...inner);
        }
      }
      return;
    }

    // Folha (só conteúdo inline) -> parágrafo
    if (!this.hasBlockContent(el)) {
      const text = this.contentOf(el);
      if (text) out.push([text]);
      return;
    }

    // Contêiner com blocos -> recursão
    for (const child of el.children) this.emit(child, out);
  }

  /** Igual a blocksOf, mas retorna [] quando o elemento é folha vazia. */
  emitContent(el) {
    const out = [];
    if (!el) return out;
    if (!this.hasBlockContent(el)) {
      const text = this.contentOf(el);
      if (text) out.push([text]);
      return out;
    }
    for (const child of el.children) this.emit(child, out);
    return out;
  }
}

function renderBlocks(blocks) {
  return blocks
    .map((block) => block.map((l) => l.trim()).filter(Boolean).join('\n'))
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Seção de skills: cada categoria é um <article> com <h3> (título) e chips
 * <span> soltos (sem semântica de bloco). Em vez de virarem um parágrafo corrido,
 * os chips são agrupados numa lista separada por vírgula.
 */
function renderSkills(doc, conv) {
  const out = [];

  const h2 = doc.querySelector('h2');
  const sectionHeading = h2 ? conv.contentOf(h2) : '';
  if (sectionHeading) out.push([`## ${sectionHeading}`]);

  for (const article of doc.querySelectorAll('article')) {
    const h3 = article.querySelector('h3');
    const heading = h3 ? conv.contentOf(h3) : '';
    if (heading) out.push([`### ${heading}`]);
    const chips = [];
    for (const span of article.querySelectorAll('div span')) {
      const text = collapseWs(span.textContent ?? '');
      if (text) chips.push(text);
    }
    if (chips.length) out.push([chips.join(', ')]);
  }
  return renderBlocks(out);
}

/* -------------------------------------------------------------------------- */
/* Cabeçalho (metadados) extraídos do header.component.html                    */
/* -------------------------------------------------------------------------- */

function extractHeaderMeta(doc, conv) {
  const q = (sel) => doc.querySelector(sel);
  const norm = (el) => (el ? collapseWs(el.textContent ?? '') : '');

  const h1 = q('h1');
  const roleEl = q('p[i18n]');
  const locationEl = q('address span[i18n]');
  const email = q('a[href^="mailto:"]');
  const phone = q('a[href^="tel:"]');
  const linkedin = q('a[href*="linkedin.com"]');
  const github = q('a[href*="github.com"]');

  const role = conv.contentOf(roleEl) || norm(roleEl);
  const location = conv.contentOf(locationEl) || norm(locationEl);

  // Telefone exibido no site (label do link) tem precedência sobre o href.
  const phoneLabel = collapseWs(phone?.textContent ?? '');
  const phoneText = phoneLabel || phone?.getAttribute('href')?.replace(/^tel:/, '') || '';

  return {
    name: norm(h1),
    role,
    location,
    email: email?.getAttribute('href')?.replace(/^mailto:/, '') ?? '',
    phone: phoneText,
    linkedin: linkedin?.getAttribute('href') ?? '',
    github: github?.getAttribute('href') ?? '',
  };
}

/* -------------------------------------------------------------------------- */
/* Front matter + doc final                                                    */
/* -------------------------------------------------------------------------- */

function frontmatter(meta, locale) {
  const lines = [
    '---',
    `name: ${meta.name}`,
    `headline: "${String(meta.role).replaceAll('"', '\\"')}"`,
    `location: "${String(meta.location).replaceAll('"', '\\"')}"`,
    'job_search: open',
    `language: ${locale}`,
    `email: ${meta.email}`,
    `phone: ${meta.phone}`,
    `linkedin: ${meta.linkedin}`,
    `github: ${meta.github}`,
    `website: ${BASE}`,
    '---',
  ];
  return lines.join('\n');
}

function docIntro(locale) {
  const msg = MESSAGES[locale];
  const other = LOCALES.filter((l) => l !== locale);
  const links = other
    .map((l) => `- [${LANG_LABELS[l]}](${BASE}${l === 'en' ? '' : l + '/'})`)
    .join('\n');
  return [msg.instructions, '', `${msg.available}\n${links}`].join('\n');
}

function buildBody(meta, locale, sectionDocs) {
  const msg = MESSAGES[locale];
  const parts = [];
  parts.push(`# ${meta.name}`);
  parts.push('');
  parts.push(`**${meta.role}** — ${meta.location}`);
  parts.push('');
  parts.push(`## ${msg.contactHeading}`);
  parts.push(`- **${msg.locationLabel}:** ${meta.location}`);
  parts.push(`- **${msg.emailLabel}:** ${meta.email}`);
  parts.push(`- **${msg.phoneLabel}:** ${meta.phone}`);
  if (meta.linkedin) parts.push(`- **LinkedIn:** ${meta.linkedin}`);
  if (meta.github) parts.push(`- **GitHub:** ${meta.github}`);
  parts.push('');
  parts.push('---');
  for (const doc of sectionDocs) {
    if (doc) parts.push('', doc);
  }
  parts.push('');
  parts.push('---');
  parts.push(`*${msg.generatedNote.replace('{locale}', locale)}*`);
  return parts.join('\n');
}

/* -------------------------------------------------------------------------- */
/* llms.txt (índice)                                                           */
/* -------------------------------------------------------------------------- */

function buildLlmstxt(meta, locale) {
  const msg = MESSAGES[locale];
  const self = locale === 'en' ? BASE : `${BASE}${locale}/`;
  const fullFile = `${self}llms-full.txt`;
  const home = self;
  const others = LOCALES
    .filter((l) => l !== locale)
    .map((l) => `- [${LANG_LABELS[l]}](${BASE}${l === 'en' ? '' : l + '/'})`);
  return [
    `# ${meta.name} — ${meta.role}`,
    '',
    `> ${msg.indexBlurb.replace('{name}', meta.name).replace('{location}', meta.location)}`,
    '',
    `## ${msg.contentHeading}`,
    `- [${msg.fullResume.replace('{locale}', locale)}](${fullFile})`,
    `- [${meta.name}](${home}): ${msg.siteLink}`,
    '',
    `## ${msg.languagesHeading}`,
    ...others,
    '',
  ].join('\n');
}

/* -------------------------------------------------------------------------- */
/* Principal                                                                   */
/* -------------------------------------------------------------------------- */

function buildLocale(locale) {
  const map = new Map();
  const converters = [];

  if (locale !== 'en') {
    const xlf = parseXlf(file(XLF_FILES[locale]));
    for (const unit of xlf) {
      if (unit.target) {
        const key = unitPlainText(unit.source);
        if (!map.has(key)) map.set(key, unitTargetToMarkdown(unit.target));
      }
    }
  }

  // cabeçalho + metadados
  const headerDoc = parseHtml(file(HEADER_FILE));
  const headerConv = new Converter(headerDoc, map, HEADER_FILE);
  converters.push(headerConv);
  const meta = extractHeaderMeta(headerDoc, headerConv);

  // corpo das seções
  const sectionDocs = SECTIONS.map((p, idx) => {
    const doc = parseHtml(file(p));
    const conv = new Converter(doc, map, p);
    converters.push(conv);
    if (idx === 2 /* skills */) return renderSkills(doc, conv);
    return renderBlocks(conv.blocksOf(doc.body ?? doc.documentElement));
  });

  // Em pt/es nenhum texto i18n pode ficar sem tradução (evita inglês vazado).
  if (locale !== 'en') {
    const missing = converters.flatMap((c) => c.missing);
    if (missing.length && !process.env.LLMS_ALLOW_MISSING) {
      throw new Error(
        `[llms:${locale}] ${missing.length} texto(s) i18n sem tradução aplicada:`
          + `\n${missing.map((t) => `  - ${t}`).join('\n')}`,
      );
    }
  }

  const body = buildBody(meta, locale, sectionDocs);
  const full = [frontmatter(meta, locale), '', docIntro(locale), '', body].join('\n');
  const index = buildLlmstxt(meta, locale);

  return {
    'llms.txt': `${index}\n`,
    'llms-full.txt': `${full}\n`,
  };
}

function main() {
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  for (const locale of LOCALES) {
    const dir = resolve(outDir, locale === 'en' ? 'en' : locale);
    mkdirSync(dir, { recursive: true });
    const files = buildLocale(locale);
    for (const [name, content] of Object.entries(files)) {
      // BOM UTF-8: alguns servidores (ex.: `ng serve`, GitHub Pages) enviam
      // `text/plain` sem `charset`. O BOM faz navegadores/parsers detectarem
      // UTF-8 e evita mojibake ("São" -> "SÃ£o") mantendo os acentos.
      const data = `\uFEFF${content}`;
      const p = resolve(dir, name);
      writeFileSync(p, data, 'utf8');
      console.log(`✓ ${p}`);
      // Espelha o par em INGLÊS para public/ (raiz) — o `ng serve` serve public/
      // na raiz do dev server, permitindo acessar /llms.txt e /llms-full.txt
      // localmente (gitignored; não interfere no build de produção, que
      // regenera pt/es em dist após o ng build).
      if (locale === 'en') {
        const pub = resolve(ROOT, 'public', name);
        writeFileSync(pub, data, 'utf8');
        console.log(`✓ ${pub} (dev mirror)`);
      }
    }
  }
  console.log(`Gerado llms.txt / llms-full.txt para ${LOCALES.join(', ')} em ${outDir}`);
}

main();
