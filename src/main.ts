import { App, Plugin, PluginSettingTab, Setting, Notice, Editor } from 'obsidian';

interface LskySettings {
  token: string;
}

export default class LskyUploader extends Plugin {
  settings: LskySettings;

  async onload() {
    await this.loadSettings();
    
    // 添加上传命令
    this.addCommand({
      id: 'upload-image',
      name: '上传图片到Lsky图床',
      callback: () => this.uploadImage()
    });

    // 添加设置面板
    this.addSettingTab(new LskySettingTab(this.app, this));
    
    // 注册粘贴事件处理
    this.registerEvent(
      this.app.workspace.on('editor-paste', this.handlePaste.bind(this))
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, {
      token: ''
    }, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  // 处理粘贴事件
  async handlePaste(evt: ClipboardEvent, editor: Editor) {
    const files = evt.clipboardData?.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;

      evt.preventDefault();
      
      try {
        new Notice('开始上传图片...');
        const markdownLink = await this.uploadImage(file);
        editor.replaceSelection(markdownLink);
        new Notice('图片上传成功！');
      } catch (error) {
        new Notice(`上传失败: ${error.message}`);
      }
    }
  }

  // 上传图片
  async uploadImage(file?: File): Promise<string> {
    if (!file) {
      return '';
    }

    const formData = new FormData();
    formData.append('file', file);

    const headers: HeadersInit = {
      'Accept': 'application/json'
    };
    
    if (this.settings.token) {
      headers['Authorization'] = `Bearer ${this.settings.token}`;
    }

    try {
      const response = await fetch('https://picgo.top/api/v1/upload', {
        method: 'POST',
        headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      if (!result.status) {
        throw new Error(result.message);
      }

      return result.data.links.markdown;
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }
}

// 设置页面
class LskySettingTab extends PluginSettingTab {
  plugin: LskyUploader;

  constructor(app: App, plugin: LskyUploader) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const {containerEl} = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName('API Token')
      .setDesc('设置Lsky Pro的API Token (可选)')
      .addText(text => text
        .setPlaceholder('输入你的API Token')
        .setValue(this.plugin.settings.token)
        .onChange(async (value) => {
          this.plugin.settings.token = value;
          await this.plugin.saveSettings();
        }));
  }
}
