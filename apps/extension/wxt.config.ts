import { defineConfig } from "wxt";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Lobe",
    description: "Turn your X bookmarks into organized, searchable context.",
    icons: {
      16: "icon/16.png",
      32: "icon/32.png",
      48: "icon/48.png",
      128: "icon/128.png",
    },
    action: {
      default_icon: {
        16: "icon/16.png",
        32: "icon/32.png",
      },
    },
    permissions: ["storage"],
    host_permissions: [
      "https://x.com/*",
      "https://twitter.com/*",
      "http://localhost/*",
    ],
    optional_host_permissions: ["http://*/*", "https://*/*"],
  },
});
