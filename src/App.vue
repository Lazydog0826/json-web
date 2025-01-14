<template>
  <div class="editor-container" ref="editorContainer"></div>
  <a-modal
    v-model:visible="model_visible"
    @ok="handleOk"
    :mask-closable="false"
  >
    <template #title>Share</template>
    <div>
      <a-spin :loading="loading" style="width: 100%">
        <a-space direction="vertical" style="width: 100%">
          <a-input-number
            v-model="hour"
            placeholder="ExpirationTime(Hour)"
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
        <a-button :loading="loading" @click="() => (model_visible = false)">
          Cancel
        </a-button>
        <a-button :loading="loading" type="primary" @click="handleOk">
          Submit
        </a-button>
      </a-space>
    </template>
  </a-modal>
</template>

<script lang="ts" setup>
import { onMounted, ref } from "vue";
import * as monaco from "monaco-editor";
import axios from "axios";
import { Message } from "@arco-design/web-vue";
import useClipboard from "vue-clipboard3";

const { toClipboard } = useClipboard();

const editorContainer = ref<HTMLDivElement | null>(null);
let editor: monaco.editor.IStandaloneCodeEditor | null = null;

const model_visible = ref(false);

const hour = ref(24);
const link = ref("");
const loading = ref(false);

const handleOk = () => {
  const json = editor.getValue();
  loading.value = true;
  axios({
    method: "post",
    url: "/Api/AddJson",
    data: {
      json: json,
      hour: hour.value,
    },
  })
    .then((r) => {
      loading.value = false;
      const origin = window.location.origin;
      link.value = `${origin}?key=${r.data.key}`;
    })
    .catch((e) => {
      loading.value = false;
    });
};

const copy = () => {
  if (link.value === "") {
    Message.error("Please Mr. Into the link");
  } else {
    toClipboard(link.value)
      .then((_) => {
        Message.success("Successful");
      })
      .catch((_) => {
        Message.error("Failure");
      });
  }
};

onMounted(() => {
  document.body.setAttribute("arco-theme", "dark");

  if (editorContainer.value) {
    editor = monaco.editor.create(editorContainer.value, {
      value: "",
      language: "json",
      theme: "vs-dark",
    });

    window.addEventListener("resize", () => {
      editor.layout();
    });

    editor.addAction({
      id: "share-json",
      label: "Share",
      contextMenuGroupId: "navigation",
      contextMenuOrder: 1,
      run: function (editor) {
        model_visible.value = true;
      },
    });
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
          if (r.data.json === "") {
            Message.error("Does not exist or has expired");
          } else {
            editor.setValue(r.data.json);
          }
        })
        .catch((_) => {
          Message.error("Request failed");
        });
    }
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
