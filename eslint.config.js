// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // The edge function is Deno with npm: specifiers, which this config cannot resolve; it is not app code.
    ignores: ["dist/*", "supabase/**"],
  }
]);
