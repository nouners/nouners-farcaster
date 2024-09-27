export default {
  '*.{js,jsx, ts,tsx}': ['prettier --write', 'eslint --fix'],
  '*.{json,yaml,yml}': ['prettier --write'],
  '*.{md,mdx}': ['prettier --write'],
  '*.{toml}': ['prettier --write'],
}
