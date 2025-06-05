<template>
  <a-layout class="layout">
    <a-layout-header class="header">
      <a-space>
        <a-select style="width: 200px" v-model="settings.language" allow-search @change="languageChange">
          <a-option
              v-for="item in languageDataArr"
              :key="item.language"
              :value="item.language">
            {{ item.title }}
          </a-option>
        </a-select>
        <a-button type="primary" @click="share_model_visible = true">
          <template #icon>
            <icon-link/>
          </template>
          <template #default>分享</template>
        </a-button>
        <a-button type="primary" @click="download">
          <template #icon>
            <icon-download/>
          </template>
          <template #default>下载</template>
        </a-button>
        <a-button type="primary" @click="openNewPage">
          <template #icon>
            <icon-share-internal/>
          </template>
          <template #default>打开新页面</template>
        </a-button>
        <a-button type="primary" @click="saveGlobalVariable" v-if="settings.language === 'json'">
          <template #icon>
            <icon-code/>
          </template>
          <template #default>保存为全局变量</template>
        </a-button>
        <a-button type="primary" @click="openFile">
          <template #icon>
            <icon-drive-file/>
          </template>
          <template #default>打开文件</template>
        </a-button>
        <a-button type="primary" @click="()=>(data_model_visible=true)">
          <template #icon>
            <icon-list/>
          </template>
          <template #default>已保存数据</template>
        </a-button>
        <a-tag v-if="pageData.currentDataName">{{ pageData.currentDataName }}</a-tag>
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
          <a-input-number v-model="hour" :min="1" :max="10000"/>
          <a-link v-show="link" :href="link" icon>{{ link }}</a-link>
        </a-space>
      </a-spin>
    </div>
    <template #footer>
      <a-space>
        <a-button :loading="loading" @click="()=>(share_model_visible=false)">
          取消
        </a-button>
        <a-button :loading="loading" type="primary" @click="shareHandle">
          生成链接
        </a-button>
      </a-space>
    </template>
  </a-modal>

  <a-modal v-model:visible="save_model_visible" :mask-closable="false">
    <template #title>保存</template>
    <div>
      <a-input placeholder="内容名称" v-model="pageData.currentDataName" allow-clear @press-enter="saveHandle"/>
    </div>
    <template #footer>
      <a-space>
        <a-button @click="()=>(save_model_visible=false)">
          取消
        </a-button>
        <a-button type="primary" @click="saveHandle">
          保存
        </a-button>
      </a-space>
    </template>
  </a-modal>

  <a-modal v-model:visible="data_model_visible" :mask-closable="true" width="50%">
    <template #title>数据</template>
    <a-space direction="vertical" style="width: 100%">
      <a-input placeholder="搜索" v-model="pageData.search" allow-clear/>
      <a-table :columns="columns" :data="tableData" style="width: 100%" :pagination="false">
        <template #optional="{record}">
          <a-space>
            <a-button type="primary" @click="tableView(record)">查看</a-button>
            <a-button type="primary" status="danger" @click="tableDelete(record)">删除</a-button>
          </a-space>
        </template>
      </a-table>
    </a-space>
    <template #footer>
      <span></span>
    </template>
  </a-modal>

  <input
      type="file"
      id="fileInput"
      style="display: none"
      accept=".txt,.json,.xml,.js,.ts,.yaml,.yml,.css,.html"
      @change="handleFileChange"
  />
</template>

<script setup>
import {onMounted, onUnmounted, ref, reactive, computed} from "vue";
import * as monaco from "monaco-editor";
import axios from "axios";
import {Message} from "@arco-design/web-vue";
import useClipboard from "vue-clipboard3";
import loader from "@monaco-editor/loader";


const languageDataArr = [
  {
    language: "yaml",
    title: "YAML",
    fileExtensionName: "yaml"
  },
  {
    language: "json",
    title: "JSON",
    fileExtensionName: ""
  },
  {
    language: "plaintext",
    title: "Text",
    fileExtensionName: "txt"
  },
  {
    language: "javascript",
    title: "JavaScript",
    fileExtensionName: "js"
  },
  {
    language: "typescript",
    title: "TypeScript",
    fileExtensionName: "ts"
  },
  {
    language: "css",
    title: "CSS",
    fileExtensionName: "css"
  },
  {
    language: "html",
    title: "HTML",
    fileExtensionName: "html"
  },
  {
    language: "xml",
    title: "XML",
    fileExtensionName: "xml"
  }
];
loader.config({monaco});
loader.config({"vs/nls": {availableLanguages: {"*": "zh-cn"}}});
const {toClipboard} = useClipboard();
const editorContainer = ref();
let editor = null;
const share_model_visible = ref(false);
const save_model_visible = ref(false);
const data_model_visible = ref(false);
const settings = reactive({
  language: "json",
  fontFamily: "Courier New",
  fontSize: 16
});
const pageData = reactive({
  currentDataName: "",
  search: ""
});
const hour = ref(1);
const link = ref("");
const loading = ref(false);
const saveDataArr = ref([]);
const columns = [
  {
    title: '名称',
    dataIndex: 'name',
    width: 150
  },
  {
    title: '语言',
    dataIndex: 'language',
    width: 100
  },
  {
    title: '内容',
    dataIndex: 'content',
    ellipsis: true,
    tooltip: true
  },
  {
    title: '操作',
    slotName: 'optional',
    width: 160
  }
];

const tableData = computed(() => {
  if (pageData.search === "") {
    return saveDataArr.value;
  }
  return saveDataArr.value.filter(x => x.name.indexOf(pageData.search) > -1);
});

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
  }).then((r) => {
    loading.value = false;
    const origin = window.location.origin;
    link.value = `${origin}/?key=${r.data.key}`;
    toClipboard(link.value)
        .then((_) => {
          Message.success("链接已复制到粘贴板");
        })
        .catch((_) => {
          Message.error("复制失败");
        });
  }).catch(() => {
    loading.value = false;
    Message.error("请求失败");
  });
};

// 保存内容
const saveHandle = () => {
  const text = editor.getValue();
  const temData = saveDataArr.value.find(x => x.name === pageData.currentDataName);
  if (temData) {
    temData.content = text;
    temData.language = settings.language;
  } else {
    saveDataArr.value.push({
      name: pageData.currentDataName,
      content: text,
      language: settings.language
    });
  }
  window.localStorage.setItem("SaveData", JSON.stringify(saveDataArr.value));
  save_model_visible.value = false;
  Message.success("保存成功");
}

// 按键触发保存
const keySave = () => {
  if (pageData.currentDataName) {
    saveHandle();
  } else {
    save_model_visible.value = true;
  }
}

// 设置
const settingsHandle = (isCache) => {
  const model = editor.getModel();
  monaco.editor.setModelLanguage(model, settings.language);
  if (isCache) {
    localStorage.setItem("settings", JSON.stringify(settings));
  }
};

// 语言切换事件
const languageChange = () => {
  settingsHandle(true);
};

// 下载
const download = () => {
  const blob = new Blob([editor.getValue()], {type: "text/plain"});
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "download." + languageDataArr.find(x => x.language === settings.language).fileExtensionName;
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

// 触发文件选择事件
const openFile = () => {
  const fileInput = document.getElementById("fileInput");
  fileInput.click();
};

// 文件选择事件
const handleFileChange = () => {
  const fileInput = document.getElementById("fileInput");
  const file = fileInput.files[0];
  if (file) {
    const fileExtend = file.name.split(".")[1];
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function (e) {
      const content = e.target.result;
      editor.setValue(content);
      settings.language = languageDataArr.find(x => x.fileExtensionName === fileExtend).language;
      settingsHandle(false);
      editor.trigger("anything", "editor.action.formatDocument");
    };
    reader.onerror = function () {
      Message.error("读取文件时出错");
    };
  }
};

// 表格查看事件
const tableView = (record) => {
  settings.language = record.language;
  editor.setValue(record.content);
  settingsHandle(false);
  data_model_visible.value = false;
}

// 表格删除事件
const tableDelete = (record) => {
  const index = saveDataArr.value.findIndex(x => x.name === record.name);
  if (index > -1) {
    saveDataArr.value.splice(index, 1);
    window.localStorage.setItem("SaveData", JSON.stringify(saveDataArr.value));
    Message.success("保存成功");
  }
}

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
        }).then((r) => {
          if (r.data.key === "") {
            Message.error("链接已过期");
          } else {
            Object.assign(settings, r.data.settings);
            settingsHandle(false);
            editor.setValue(r.data.text);
          }
        }).catch((_) => {
          Message.error("请求失败");
        });
      } else {
        navigator.clipboard.readText().then((text) => {
          editor.setValue(text);
        });
      }
    });
  }

  // 添加ctrl+s监听
  window.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 's') {
      event.preventDefault();
      keySave();
    }
  });

  // 加载保存的数据
  const saveDataArrStr = window.localStorage.getItem("SaveData");
  if (saveDataArrStr) {
    try {
      saveDataArr.value = JSON.parse(saveDataArrStr);
    } catch {
      saveDataArr.value = [];
      console.log("加载缓存失败")
    }
  }
});

onUnmounted(() => {
  if (editor.value) editor.value.dispose();
});
</script>

<style lang="scss" scoped>
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
