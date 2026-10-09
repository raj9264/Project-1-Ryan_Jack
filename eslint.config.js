const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    files: ["src/server.js", "src/data.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
      },
    },
    rules: {
      "no-console": "warn",
    },
  },
  {
    files: ["src/public/app.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        document: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        URLSearchParams: "readonly",
        encodeURIComponent: "readonly",
        console: "readonly",
        Promise: "readonly",
        Object: "readonly",
        String: "readonly",
        Array: "readonly",
        Number: "readonly",
        JSON: "readonly",
        Error: "readonly",
      },
    },
  },
];