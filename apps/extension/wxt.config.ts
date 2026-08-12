import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Lobe",
    description: "Turn your X bookmarks into organized, searchable context.",
    permissions: ["storage"],
    host_permissions: [
      "https://x.com/*",
      "https://twitter.com/*",
      "http://localhost/*",
    ],
  },
});
