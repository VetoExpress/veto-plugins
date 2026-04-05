import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import archiver from 'archiver';
import { getPluginList, getStarCount } from '../utils.js';

const JSDELIVR_BASE = 'https://cdn.jsdelivr.net/gh/VetoExpress/veto-plugins@main/dist';

const PACK_EXCLUDES = [
	'.git/**', '.github/**', 'node_modules/**',
	'README.md', 'README.MD', 'README.txt', 'README.TXT',
];

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

const packToVmod = (srcDir, destFile) => new Promise((resolve, reject) => {
	const output = fs.createWriteStream(destFile);
	const archive = archiver('zip', { zlib: { level: 9 } });
	output.on('close', resolve);
	archive.on('error', reject);
	archive.pipe(output);
	archive.glob('**/*', { cwd: srcDir, ignore: PACK_EXCLUDES, dot: false });
	archive.finalize();
});

const computeSha256 = (filePath) => {
	const hash = crypto.createHash('sha256');
	hash.update(fs.readFileSync(filePath));
	return hash.digest('hex');
};

// Setup dist directories
const distPath = path.resolve(process.cwd(), '../../dist');
const vmodsPath = path.join(distPath, 'vmods');
const previewsPath = path.join(distPath, 'previews');
for (const dir of [distPath, vmodsPath, previewsPath]) {
	fs.mkdirSync(dir, { recursive: true });
}

const definedPluginList = getPluginList();
const starCount = getStarCount();

!(async () => {
	const pluginList = [];

	const plugins = fs.readdirSync(path.resolve(process.cwd(), '../../plugins-data'));
	for (const plugin of plugins) {
		if (plugin.startsWith('.')) continue;

		const pluginSrcPath = path.resolve(process.cwd(), `../../plugins-data/${plugin}`);
		const manifestPath = path.join(pluginSrcPath, 'manifest.json');

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

		// Preview: copy to dist/previews/ and update field to CDN URL
		if (pluginJson.preview) {
			pluginJson.preview = pluginJson.preview.replace(/^\.?[\\/]/g, '');
			const previewSrc = path.join(pluginSrcPath, pluginJson.preview);
			if (!fs.existsSync(previewSrc)) {
				console.log(`🖼️  Preview of ${plugin} not found, ignored.`);
				delete pluginJson.preview;
			} else {
				const previewExt = path.extname(pluginJson.preview) || '.png';
				const previewFilename = `${pluginId}${previewExt}`;
				fs.copyFileSync(previewSrc, path.join(previewsPath, previewFilename));
				pluginJson.preview = `${JSDELIVR_BASE}/previews/${previewFilename}`;
				console.log(`🖼️  Preview → dist/previews/${previewFilename}`);
			}
		}

		// Pack to .vmod
		const vmodDest = path.join(vmodsPath, `${pluginId}.vmod`);
		process.stdout.write(`📦 Packing ${pluginId}...`);
		await packToVmod(pluginSrcPath, vmodDest);

		// Hash & size
		const hash = computeSha256(vmodDest);
		const filesize = fs.statSync(vmodDest).size;

		addField(pluginJson, 'download_url', `${JSDELIVR_BASE}/vmods/${pluginId}.vmod`);
		addField(pluginJson, 'hash', hash);
		addField(pluginJson, 'filesize', filesize);

		pluginList.push(pluginJson);
		console.log(` ✅ ${manifest.version}  ${(filesize / 1024).toFixed(1)} KB  ${hash.substring(0, 12)}…`);
	}

	fs.writeFileSync(path.join(distPath, 'registry.json'), JSON.stringify(pluginList, null, 2));
	console.log(`\n✅ dist/registry.json generated with ${pluginList.length} plugin(s).`);
})();

