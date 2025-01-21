<template>
  <div class="editor-container" ref="editorContainer"></div>

  <a-modal v-model:visible="share_model_visible" :mask-closable="false">
    <template #title>分享</template>
    <div>
      <a-spin :loading="loading" style="width: 100%">
        <a-space direction="vertical" style="width: 100%">
          <a-input-number
            v-model="hour"
            placeholder="过期时间 - 小时"
            :min="1"
            :max="10000"
          />
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

  <a-modal v-model:visible="settings_visible" :mask-closable="false">
    <template #title>设置</template>
    <div>
      <a-form :model="settings" layout="vertical">
        <a-form-item field="language" label="语言">
          <a-select v-model="settings.language" allow-search>
            <a-option value="plaintext">PlainText</a-option>
            <a-option value="javascript">JavaScript</a-option>
            <a-option value="typescript">TypeScript</a-option>
            <a-option value="css">CSS</a-option>
            <a-option value="html">HTML</a-option>
            <a-option value="json">JSON</a-option>
            <a-option value="xml">XML</a-option>
            <a-option value="yaml">YAML</a-option>
            <a-option value="markdown">Markdown</a-option>
            <a-option value="csharp">C#</a-option>
            <a-option value="rust">Rust</a-option>
            <a-option value="sql">SQL</a-option>
            <a-option value="bash">Bash</a-option>
            <a-option value="powershell">PowerShell</a-option>
            <a-option value="dockerfile">Dockerfile</a-option>
            <a-option value="less">Less</a-option>
            <a-option value="scss">SCSS</a-option>
            <a-option value="sass">Sass</a-option>
            <a-option value="stylus">Stylus</a-option>
          </a-select>
        </a-form-item>
        <a-form-item field="fontFamily" label="字体">
          <a-input v-model="settings.fontFamily" />
        </a-form-item>
        <a-form-item field="fontSize" label="字体大小">
          <a-input-number v-model="settings.fontSize" :min="14" :max="30" />
        </a-form-item>
      </a-form>
    </div>
    <template #footer>
      <a-space>
        <a-button @click="settingsCancel"> 取消 </a-button>
        <a-button
          :loading="loading"
          type="primary"
          @click="settingsHandle(true)"
        >
          设置
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
const settings_visible = ref(false);

let currSettings = {
  language: "json",
  fontFamily: "Courier New",
  fontSize: 16,
};

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
      settings: currSettings,
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
  Object.assign(currSettings, settings);
  editor.updateOptions({ ...currSettings });
  const model = editor.getModel();
  monaco.editor.setModelLanguage(model, currSettings.language);
  settings_visible.value = false;
  if (isCache) {
    localStorage.setItem("settings", JSON.stringify(currSettings));
  }
};

// 取消设置
const settingsCancel = () => {
  Object.assign(settings, currSettings);
  settings_visible.value = false;
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
        id: "change-settings",
        label: "设置",
        contextMenuGroupId: "navigation",
        contextMenuOrder: 0,
        run: function (editor) {
          settings_visible.value = true;
        },
      });

      editor.addAction({
        id: "share-json",
        label: "分享",
        contextMenuGroupId: "navigation",
        contextMenuOrder: 0.1,
        run: function (editor) {
          share_model_visible.value = true;
        },
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
.editor-container {
  width: 100%;
  height: 100%;
  position: fixed;
}
</style>
