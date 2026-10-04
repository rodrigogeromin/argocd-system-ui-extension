import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
export default tseslint.config({files:['**/*.cjs'],languageOptions:{globals:globals.node}}, js.configs.recommended, ...tseslint.configs.recommended, {
  files: ['**/*.{ts,tsx}'], languageOptions: {globals: {...globals.browser, ...globals.jest}},
  rules: {'@typescript-eslint/no-explicit-any': 'error'}
}, {
  files: ['src/app/**/*.{ts,tsx}', 'src/features/**/*.{ts,tsx}', 'src/components/**/*.{ts,tsx}'],
  rules: {
    'no-restricted-properties': ['error', {object:'window',property:'extensionsAPI',message:'Host runtime belongs to src/argocd'}, {object:'globalThis',property:'extensionsAPI',message:'Host runtime belongs to src/argocd'}],
    'no-restricted-globals': ['error', {name:'extensionsAPI',message:'Host runtime belongs to src/argocd'}],
    '@typescript-eslint/no-restricted-imports': ['error', {patterns:[{group:['**/argocd/**'],allowTypeImports:true,message:'UI can only import host adapter types'},{group:['**/index'],message:'UI must not import installed entrypoint'}]}]
  }
});
