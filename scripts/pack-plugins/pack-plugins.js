import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getPluginList, getStarCount } from '../utils.js';

const compulsoryFields = ['id', 'name', 'author', 'version', 'type'];
const optionalFields = [
	'description', 'preview', 'min_engine_version',
	'definitions', 'i18n', 'dependencies', 'scenarios',
	'tags', 'license', 'homepage', 'fork_of',
];

const addField = (json, field, value) => {
	if (value !== undefined && value !== null) {
		json[field] = value;
	}
};

const checkCompulsoryFields = (json, pluginId) => {
	for (const field of compulsoryFields) {
		if (!json[field]) {
			console.log(`❌ Plugin ${pluginId} is missing field "${field}" in manifest.json.`);
			return false;
		}
	}
	return true;
};

const definedPluginList = getPluginList();
const starCount = getStarCount();

const distPath = path.resolve(process.cwd(), '../../dist');
if (!fs.existsSync(distPath)) {
	fs.mkdirSync(distPath, { recursive: true });
}

!(async () => {
	const pluginList = [];

	const plugins = fs.readdirSync(path.resolve(process.cwd(), '../../plugins-data'));
	for (const plugin of plugins) {
		if (plugin.startsWith('.')) continue;

		const manifestPath = path.resolve(process.cwd(), `../../plugins-data/${plugin}/manifest.json`);
		if (!fs.existsSync(manifestPath)) {
			console.log(`❌ Plugin ${plugin} has no manifest.json.`);
			continue;
		}
		const manifest = JSON.parse(fs.readFileSync(manifestPath));

		let pluginJson = {};
		for (const field of compulsoryFields) {
			addField(pluginJson, field, manifest[field]);
		}
		if (!checkCompulsoryFields(pluginJson, plugin)) {
			console.log(`⏩ Skipped.`);
			continue;
		}
		for (const field of optionalFields) {
			addField(pluginJson, field, manifest[field]);
		}

		const pluginId = manifest.id ?? plugin;
		addField(pluginJson, 'update_time', parseInt(execSync(`git log -1 --format=%ct "${manifestPath}"`)));
		addField(pluginJson, 'publish_time', parseInt(execSync(`git log --reverse --format=%ct "${manifestPath}"`).toString().split('\n')[0]));

		const registryEntry = definedPluginList.find((p) => p.id === pluginId);
		const repo = registryEntry?.repo ?? '';
		addField(pluginJson, 'repo', repo);
		addField(pluginJson, 'stars', starCount[repo] ?? 0);

		if (pluginJson.preview) {
			pluginJson.preview = pluginJson.preview.replace(/^\.?[\\/]/g, '');
			const previewAbs = path.resolve(process.cwd(), `../../plugins-data/${plugin}/${pluginJson.preview}`);
			if (!fs.existsSync(previewAbs)) {
				console.log(`🖼️ Preview of ${plugin} not found, ignored.`);
				delete pluginJson.preview;
			} else {
				// Keep as a relative path; the frontend references plugins-data directly via the repo
				pluginJson.preview = `plugins-data/${plugin}/${pluginJson.preview}`;
			}
		}

		pluginList.push(pluginJson);
		console.log(`📋 ${pluginId} ${manifest.version} added to registry.`);
	}

	const registryJson = JSON.stringify(pluginList, null, 2);
	fs.writeFileSync(path.resolve(distPath, 'registry.json'), registryJson);
	console.log(`\n✅ dist/registry.json generated with ${pluginList.length} plugin(s).`);
})();

