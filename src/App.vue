<template>
  <a-layout class="layout">
    <a-layout-header class="header">
      <a-space>
        <a-select
          style="width: 200px"
          v-model="settings.language"
          allow-search
          @change="languageChange"
        >
          <a-option value="plaintext">PlainText</a-option>
          <a-option value="javascript">JavaScript</a-option>
          <a-option value="typescript">TypeScript</a-option>
          <a-option value="css">CSS</a-option>
          <a-option value="html">HTML</a-option>
          <a-option value="json">JSON</a-option>
          <a-option value="xml">XML</a-option>
          <a-option value="yaml">YAML</a-option>
        </a-select>
        <a-button type="primary" @click="share_model_visible = true">
          <template #icon>
            <icon-link />
          </template>
          <template #default>分享</template>
        </a-button>
        <a-button type="primary" @click="download">
          <template #icon>
            <icon-download />
          </template>
          <template #default>下载</template>
        </a-button>
        <a-button type="primary" @click="openNewPage">
          <template #icon>
            <icon-share-internal />
          </template>
          <template #default>打开新页面</template>
        </a-button>
        <a-button
          type="primary"
          @click="saveGlobalVariable"
          v-show="settings.language == 'json'"
        >
          <template #icon>
            <icon-code />
          </template>
          <template #default>保存为全局变量</template>
        </a-button>
      </a-space>
    </a-layout-header>

    <a-layout-content>
      <div class="editor-container" ref="editorContainer"></div>
    </a-layout-content>
  </a-layout>

  <a-modal v-model:visible="share_model_visible" :mask-closable="false">
    <template #title>分享</template>
    <div>
      <a-spin :loading="loading" style="width: 100%">
        <a-space direction="vertical" style="width: 100%">
          <a-alert>过期时间 : 小时</a-alert>
          <a-input-number v-model="hour" :min="1" :max="10000" />
          <a-link v-show="link !== ''" :href="link">{{ link }}</a-link>
          <a-link v-show="link !== ''" @click="copy">Copy</a-link>
        </a-space>
      </a-spin>
    </div>
    <template #footer>
      <a-space>
        <a-button
          :loading="loading"
          @click="() => (share_model_visible = false)"
        >
          取消
        </a-button>
        <a-button :loading="loading" type="primary" @click="shareHandle">
          生成链接
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script setup>
import { onMounted, onUnmounted, ref, reactive } from "vue";
import * as monaco from "monaco-editor";
import axios from "axios";
import { Message } from "@arco-design/web-vue";
import useClipboard from "vue-clipboard3";
import loader from "@monaco-editor/loader";

loader.config({ monaco });
loader.config({ "vs/nls": { availableLanguages: { "*": "zh-cn" } } });

const { toClipboard } = useClipboard();

const editorContainer = ref(null);
let editor = null;

const share_model_visible = ref(false);

const settings = reactive({
  language: "json",
  fontFamily: "Courier New",
  fontSize: 16,
});

const hour = ref(1);
const link = ref("");
const loading = ref(false);

// 分享
const shareHandle = () => {
  const text = editor.getValue();
  loading.value = true;
  axios({
    method: "post",
    url: "/Api/AddJson",
    data: {
      text,
      hour: hour.value,
      settings,
    },
  })
    .then((r) => {
      loading.value = false;
      const origin = window.location.origin;
      link.value = `${origin}?key=${r.data.key}`;
    })
    .catch((e) => {
      loading.value = false;
      Message.error("请求失败");
    });
};

// 设置
const settingsHandle = (isCache) => {
  const model = editor.getModel();
  monaco.editor.setModelLanguage(model, settings.language);
  if (isCache) {
    localStorage.setItem("settings", JSON.stringify(settings));
  }
};

// 语言切换事件
const languageChange = (language) => {
  settingsHandle(true);
};

// 复制
const copy = () => {
  if (link.value === "") {
    Message.error("先生成链接");
  } else {
    toClipboard(link.value)
      .then((_) => {
        Message.success("复制成功");
      })
      .catch((_) => {
        Message.error("复制失败");
      });
  }
};

// 下载
const download = () => {
  const blob = new Blob([editor.getValue()], { type: "text/plain" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "download.";

  switch (settings.language) {
    case "plaintext":
      link.download += "txt";
      break;
    case "javascript":
      link.download += "js";
      break;
    case "typescript":
      link.download += "ts";
      break;
    default:
      link.download += settings.language;
      break;
  }
  link.click();
  link.remove();
};

// 保存为全局变量
const saveGlobalVariable = () => {
  const json = editor.getValue();
  let i = 1;
  while (true) {
    if (window[`temp${i}`] == null) {
      window[`temp${i}`] = JSON.parse(json);
      console.log(`temp${i}`, window[`temp${i}`]);
      break;
    }
    i++;
  }
};

// 打开新页面
const openNewPage = () => {
  window.open(window.location.origin);
};

onMounted(() => {
  document.body.setAttribute("arco-theme", "dark");
  if (editorContainer.value) {
    loader.init().then((monacoInstance) => {
      editor = monacoInstance.editor.create(editorContainer.value, {
        value: "",
        language: settings.language,
        theme: "vs-dark",
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        automaticLayout: true,
      });

      editor.addAction({
        id: "fold-all",
        label: "折叠所有",
        contextMenuGroupId: "navigation",
        contextMenuOrder: 0.2,
        run: function (editor) {
          editor.getAction("editor.foldAll").run();
        },
      });

      editor.addAction({
        id: "unfold-all",
        label: "展开所有",
        contextMenuGroupId: "navigation",
        contextMenuOrder: 0.3,
        run: function (editor) {
          editor.getAction("editor.unfoldAll").run();
        },
      });

      // 读取配置缓存
      const settingsCache = localStorage.getItem("settings");
      if (settingsCache) {
        const settingsCacheObj = JSON.parse(settingsCache);
        Object.assign(settings, settingsCacheObj);
        settingsHandle(false);
      }

      // 读取key
      const params = new URLSearchParams(window.location.search);
      const key = params.get("key");
      if (key) {
        axios({
          method: "get",
          url: "/Api/GetJson",
          params: {
            key,
          },
        })
          .then((r) => {
            if (r.data.key === "") {
              Message.error("链接已过期");
            } else {
              Object.assign(settings, r.data.settings);
              settingsHandle(false);
              editor.setValue(r.data.text);
            }
          })
          .catch((_) => {
            Message.error("请求失败");
          });
      } else {
        navigator.clipboard.readText().then((text) => {
          editor.setValue(text);
        });
      }
    });
  }
});

onUnmounted(() => {
  if (editor.value) {
    editor.value.dispose();
  }
});
</script>

<style scoped>
.layout {
  height: 100%;
  width: 100%;
  position: fixed;
  .header {
    height: 48px;
    line-height: 48px;
    padding-left: 12px;
    border-bottom: 1px solid var(--color-fill-2);
  }
}

.editor-container {
  width: 100%;
  height: 100%;
  position: fixed;
}
</style>
