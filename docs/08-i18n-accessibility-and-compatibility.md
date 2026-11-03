# 08 — Internationalization, Accessibility and Old-Device Compatibility

## 1. Language requirements

Project decision:

- Persian is the primary language.
- English is developed simultaneously.
- Both UI and content discovery support language distinctions.

This gives NFR-18 a concrete bilingual target.

## 2. UI localization

Planned structure:

~~~text
frontend/src/i18n/
├── fa/
│   ├── common.json
│   ├── auth.json
│   ├── feed.json
│   └── ...
└── en/
    ├── common.json
    ├── auth.json
    ├── feed.json
    └── ...
~~~

Exact namespaces may evolve.

## 3. User-facing text

Once i18n is introduced, user-facing labels should come from translation keys rather than being duplicated in components.

The same applies to:

- navigation;
- validation messages where practical;
- empty states;
- settings;
- notification labels.

## 4. RTL/LTR strategy

Direction follows active UI language.

~~~text
fa → dir="rtl"
en → dir="ltr"
~~~

Prefer CSS logical properties:

~~~css
margin-inline-start
padding-inline-end
border-inline-start
text-align: start
~~~

instead of unnecessary left/right assumptions.

## 5. Content language is separate from UI language

A Persian UI user may still want English content.

Therefore distinguish:

~~~text
preferred_ui_language
content-language preferences
Idea.language
~~~

Do not assume UI language equals content filter.

## 6. Persian search considerations

Persian search eventually needs attention to:

- Arabic/Persian forms of ی and ک;
- whitespace;
- نیم‌فاصله / ZWNJ;
- normalization.

Do not destructively rewrite stored original text. Search normalization should be a derived/query concern.

## 7. Old-device compatibility goal

The expected user population may include older Iranian phones.

Therefore priorities are:

1. core web usability on older devices;
2. lightweight UI;
3. graceful degradation;
4. test-driven support.

The source NFR-09 says native iOS 14+/Android 9+. The project changes delivery to web/PWA-first so a native wrapper does not become the minimum OS gate.

## 8. Compatibility policy

Do not promise an exact minimum OS version before testing.

Evaluation process:

- test core experience on older iOS/Safari where available;
- test on older Android/Chrome/WebView where available;
- identify earliest practical combination;
- document unsupported optional capabilities separately.

An early engineering target may be around iOS 12+ / Android 7+ for core web experience, but this is a **test target, not a guaranteed requirement** until verified.

## 9. Graceful degradation tiers

### Tier 1 — Core must work

- login;
- feed;
- idea detail;
- source information;
- save;
- spark;
- comments;
- library;
- creator profile;
- basic search.

### Tier 2 — Use when platform supports it

- installable PWA;
- offline caching;
- advanced TTS behavior;
- Web Push;
- sophisticated realtime UX.

Tier 2 failure must not break Tier 1.

## 10. Performance on old devices

Avoid unnecessary:

- giant JavaScript bundles;
- heavy animation;
- large image payloads;
- uncontrolled rerenders;
- huge client-side datasets;
- autoplay media;
- heavy third-party UI libraries.

Images should be responsive and appropriately sized.

## 11. Build compatibility

Vite build targets and legacy support are evaluated after real frontend dependencies are known.

Do not add polyfills blindly. Test target browsers, identify missing features, then add the minimum required compatibility layer.

## 12. Accessibility target

Source NFR-16 requires WCAG 2.1 AA.

Project policy:

- WCAG 2.1 AA is the minimum source target;
- follow useful WCAG 2.2 improvements where straightforward;
- do not claim conformance without testing.

## 13. Accessibility baseline

Use:

- semantic HTML;
- correct heading hierarchy;
- native buttons/links;
- form labels;
- keyboard navigation;
- visible focus;
- sufficient contrast;
- alt text for meaningful images;
- ARIA only when semantic HTML is insufficient;
- appropriate touch target sizing.

## 14. Screen-reader story

Every interactive feature should consider:

- keyboard/focus path where applicable;
- accessible name;
- state announcement when needed;
- no interaction that exists only on hover.

## 15. Accessibility testing

Planned:

- manual keyboard testing;
- browser accessibility inspection;
- automated axe-style checks when integrated;
- Playwright critical-flow checks later.

Automation does not replace manual testing.
