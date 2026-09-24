# Professional Portfolio

For details on this professional portfolio, please see https://techfolios.github.io.

## English and Japanese

The original URLs remain English. Japanese pages mirror the same paths under
`/ja/` (for example, `/projects/BlenderCLI.html` and
`/ja/projects/BlenderCLI.html`). The language switch links directly to the same
page in the other language and works without JavaScript. Internal navigation
stays in the current language. If a translation has not been added yet, that
language is disabled for the page instead of linking to a missing page.

- Shared interface copy: `_data/i18n.json`.
- English biography and resume: `_data/bio.json`.
- Japanese biography and resume: `_data/bio_ja.json`. Contact links and phone
  numbers use the English file as the shared source.
- Japanese page content: `ja/projects/`, `ja/essays/`, and `ja/unreal-journey/`.
- Shared layouts and language handling: `_layouts/` and `_includes/locale.html`.

When adding a page, create its Japanese counterpart with the same filename
under `ja/` and add `lang: ja` to the front matter. Translate descriptions,
labels, and prose, while preserving project titles, dates, ordering, images,
technical examples, and download URLs. Keep publication status synchronized
between the two files; when removing a page, remove both language versions.
Translations are authored content, not automatically generated at runtime.

Archive lists display only the selected language. Homepage totals count the
original English entries, so translations do not double the dynamic project,
essay, or Unreal milestone counts. Unpublished content is not translated.

Navigation labels and the tagline “技術に、創造力を。Technology with imagination.”
are intentionally unchanged in both languages. Both versions use the same
layout and assets, with a small Japanese typography adjustment for readability.

## Local preview

With Ruby and Bundler installed, run `bundle install` and then
`bundle exec jekyll serve`. Check both `/` and `/ja/`. A production build can be
checked with `bundle exec jekyll build` before deployment through the existing
GitHub Actions workflow.
