import fs from 'fs';
import path from 'path';

export const isValidPluginJson = (json) => {
	if (!json.id) return false;
	if (!json.repo) return false;
	if (!/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(json.repo)) return false;
	return true;
};	

export const getPluginList = () => {
	const pluginList = [];
	const pluginListPath = path.resolve(process.cwd(), '../../plugin-list');
	const files = fs.readdirSync(pluginListPath);
	files.forEach((file) => {
		if (!file.endsWith('.json')) {
			return;
		}
		const parsed = JSON.parse(fs.readFileSync(path.join(pluginListPath, file)));
		const plugins = Array.isArray(parsed) ? parsed : [parsed];

		plugins.forEach((plugin) => {
			if (!isValidPluginJson(plugin)) {
				console.log(`❌ Invalid plugin json (Missing id or repo): ${file}`);
				return;
			}

			plugin.branch = plugin.branch ?? 'main';

			plugin.subpath = plugin?.subpath ?? '/';
			if (plugin.subpath.endsWith('/')) plugin.subpath = plugin.subpath.slice(0, -1);
			if (!plugin.subpath.startsWith('/')) plugin.subpath = `/${plugin.subpath}`;

			pluginList.push(plugin);
		});
	});
	return pluginList;
}
export const getStarCount = () => {
	const starsPath = path.resolve(process.cwd(), '../../stars.json');
	if (fs.existsSync(starsPath)) {
		return JSON.parse(fs.readFileSync(starsPath));
	}
	return {};
}