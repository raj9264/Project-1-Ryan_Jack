const js = require("@eslint/js");

module.exports = [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        process: "readonly",
        Buffer: "readonly",
        console: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        document: "readonly",
        window: "readonly",
        Option: "readonly",
        fetch: "readonly",
        FormData: "readonly",
        navigator: "readonly",
      },
    },
    rules: {
      "no-console": "warn",
    },
  },
];