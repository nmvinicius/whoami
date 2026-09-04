#!/usr/bin/env node
/**
 * finalize-index.mjs
 *
 * Pós-processa os `index.html` do build multi-locale para que a raiz `/whoami/`
 * seja equivalente ao `/whoami/en/`, mas autossuficiente e canônica:
 *
 *   1. Reescreve o `<base href="/whoami/en/">` -> `/whoami/` SOMENTE no index da
 *      raiz (cópia do bundle `en` feita por `build:copy-root`). Com isso os
 *      assets (main.js etc.) e os links relativos (`llms.txt`, favicon) passam a
 *      resolver na própria raiz, sem depender da pasta `/en/`.
 *   2. Injeta `<link rel="canonical">` em cada locale:
 *        - inglês (raiz E /en/) -> `<base>/` (a raiz é a canônica do inglês)
 *        - /pt/ e /es/         -> o próprio caminho do locale
 *
 * Roda DEPOIS de `npm run build:copy-root` (precisa de `dist/whoami/browser`).
 * O `<base>` é lido do `angular.json` (produção), com fallback para `/whoami/`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(SCRIPT_DIR, '..');
const BROWSER = resolve(ROOT, 'dist/whoami/browser');

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

function finalizeOne(indexPath, { canonical, baseFrom, baseTo }) {
  let html = readFileSync(indexPath, 'utf8');
  let changed = false;

  if (canonical && !/rel="canonical"/.test(html)) {
    // injeta logo após a tag <base ...>
    html = html.replace(/(<base\b[^>]*>)/, `$1\n    <link rel="canonical" href="${canonical}">`);
    changed = true;
  }

  if (baseFrom && baseTo && html.includes(baseFrom)) {
    html = html.replaceAll(baseFrom, baseTo);
    changed = true;
  }

  if (changed) {
    writeFileSync(indexPath, html, 'utf8');
    console.log(`✓ atualizado: ${indexPath}`);
  } else {
    console.log(`· inalterado: ${indexPath}`);
  }
}

function main() {
  const BASE = readBaseHref().replace(/\/?$/, '/'); // garante barra final

  const targets = [
    // Raiz (cópia do en): base aponta para o próprio /whoami/, canônico na raiz.
    { file: resolve(BROWSER, 'index.html'), canonical: BASE, baseFrom: `${BASE}en/`, baseTo: BASE },
    // /en/: mantém base própria, mas canônico na raiz (evita duplicado de SEO).
    { file: resolve(BROWSER, 'en/index.html'), canonical: BASE, baseFrom: null, baseTo: null },
    // /pt/ e /es/: canônicos em si mesmos.
    { file: resolve(BROWSER, 'pt/index.html'), canonical: `${BASE}pt/`, baseFrom: null, baseTo: null },
    { file: resolve(BROWSER, 'es/index.html'), canonical: `${BASE}es/`, baseFrom: null, baseTo: null },
  ];

  for (const t of targets) finalizeOne(t.file, t);
  console.log(`Finalizado (base ${BASE}) em ${BROWSER}`);
}

main();
