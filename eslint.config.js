import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "chrome", "chrome-headless-shell", "exports", "public/_media"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { "react-hooks": reactHooks, "react-refresh": reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": "off",
      // 卡片参数是运行时 JSON 驱动的动态字典,CardDef<any> 是有意为之
      "@typescript-eslint/no-explicit-any": "off",
      // 本库大量「捕获后静默」的容错分支(坏存档/坏输入当没发生),注释在 catch 处说明意图
      "no-empty": ["error", { allowEmptyCatch: true }],
    },
  },
  {
    // export.mjs 里有 puppeteer page.evaluate(...) 嵌入的浏览器端代码,
    // 同时挂 node + browser 两套全局
    files: ["scripts/**/*.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  {
    files: ["vite.config.ts", "server/**/*.ts", "eslint.config.js"],
    languageOptions: { globals: { ...globals.node } },
  },
);
