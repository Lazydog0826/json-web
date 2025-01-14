import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import jsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";

import ArcoVue from "@arco-design/web-vue";
import "@arco-design/web-vue/dist/arco.css";

self.MonacoEnvironment = {
  getWorker(_1: string, _2: string) {
    return new jsonWorker();
  },
};

createApp(App).use(ArcoVue).mount("#app");
