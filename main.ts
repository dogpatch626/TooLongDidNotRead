import { App, Editor, MarkdownView, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { GoogleGenAI } from '@google/genai';



interface TooLongDidNotReadPluginSettings {
	mySetting: string | undefined;
}

const DEFAULT_SETTINGS: TooLongDidNotReadPluginSettings = {
	mySetting: undefined
}
const loaderIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><radialGradient id="a12" cx=".66" fx=".66" cy=".3125" fy=".3125" gradientTransform="scale(1.5)"><stop offset="0" stop-color="#FF156D"></stop><stop offset=".3" stop-color="#FF156D" stop-opacity=".9"></stop><stop offset=".6" stop-color="#FF156D" stop-opacity=".6"></stop><stop offset=".8" stop-color="#FF156D" stop-opacity=".3"></stop><stop offset="1" stop-color="#FF156D" stop-opacity="0"></stop></radialGradient><circle transform-origin="center" fill="none" stroke="url(#a12)" stroke-width="15" stroke-linecap="round" stroke-dasharray="200 1000" stroke-dashoffset="0" cx="100" cy="100" r="70"><animateTransform type="rotate" attributeName="transform" calcMode="spline" dur="2" values="360;0" keyTimes="0;1" keySplines="0 0 1 1" repeatCount="indefinite"></animateTransform></circle><circle transform-origin="center" fill="none" opacity=".2" stroke="#FF156D" stroke-width="15" stroke-linecap="round" cx="100" cy="100" r="70"></circle></svg>`;
const sparkle = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkle-icon lucide-sparkle"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/></svg>`;
const errorIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-x-icon lucide-circle-x"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>`;

export default class TooLongDidNotReadPlugin extends Plugin {
	settings: TooLongDidNotReadPluginSettings;
	private client: GoogleGenAI;
	async onload() {
		await this.loadSettings();
		this.client = new GoogleGenAI({ apiKey: this.settings.mySetting });
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const ribbonIconEl = this.addRibbonIcon('sparkle', 'Sample Plugin', (evt: MouseEvent) => {
			this.client = new GoogleGenAI({ apiKey: this.settings.mySetting });
			new Notice("Api Key Set");
		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.innerHTML = sparkle;

		// This adds an editor command that can perform some operation on the current editor instance
		this.addCommand({
			id: 'analyze-document',
			name: 'Analyze Document',
			editorCallback: async (editor: Editor, view: MarkdownView) => {
				const selection = editor.getSelection();
				if (selection.length > 0 && this.settings.mySetting) {
					statusBarItemEl.addClass('status-loader')
					statusBarItemEl.innerHTML = loaderIcon;
					const response = await this.client.models.generateContent({
						model: "gemini-2.5-flash-preview-05-20",
						contents: [
							`Summarize this document: ${selection} `,
						],
						config: {
							tools: [{ urlContext: {} }],
						},
					});
					if (!response) {
						console.log(response);
						statusBarItemEl.innerHTML = errorIcon;
						setTimeout(() => statusBarItemEl.innerHTML = sparkle, 100)

					} else {
						editor.replaceRange(JSON.stringify(response.text), editor.getCursor())
						statusBarItemEl.innerHTML = sparkle;


					}
				}
			}
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: TooLongDidNotReadPlugin;

	constructor(app: App, plugin: TooLongDidNotReadPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Gemini Api Key')
			.setDesc('This is a seceret obtained through https://ai.google.dev/gemini-api/docs/api-key')
			.addText(text => text
				.setPlaceholder('Enter your api key')
				.setValue(this.plugin.settings.mySetting || '')
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
