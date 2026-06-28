import tsParser from '@typescript-eslint/parser'
import reactHooks from 'eslint-plugin-react-hooks'
import nextPlugin from '@next/eslint-plugin-next'

/**
 * Pragmatic, build-safe lint (#13).
 *
 * The project intentionally does NOT error on style (no-unused-vars etc. stay
 * off — a deliberate choice so iteration isn't blocked). This config adds a small
 * set of HIGH-SIGNAL correctness rules that catch real bugs, all at "warn" so
 * `next build` never fails on lint. Run `npm run lint` to see them.
 *
 * @type {import('eslint').Linter.Config[]}
 */
const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'],
  },
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true }, sourceType: 'module' },
    },
    // Register the Next/React-Hooks plugins so existing inline eslint-disable
    // directives resolve (the rules are surfaced as warnings, never build errors).
    plugins: { 'react-hooks': reactHooks, '@next/next': nextPlugin },
    rules: {
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      '@next/next/no-img-element': 'warn',
      'no-dupe-keys': 'warn',                   // duplicate object keys silently drop data
      'no-dupe-else-if': 'warn',                // copy-paste branch bug
      'no-unsafe-negation': 'warn',             // !a in b — almost always wrong
      'no-constant-binary-expression': 'warn',  // precedence traps (?? with ||, etc.)
      'no-self-compare': 'warn',                // x === x
      'no-unreachable': 'warn',                 // dead code after return/throw
      'no-fallthrough': 'warn',                 // missing break in switch
      'use-isnan': 'warn',                      // x === NaN is never true
    },
  },
]

export default config
