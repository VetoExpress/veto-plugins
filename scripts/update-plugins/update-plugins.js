import fs from 'fs';
import path from 'path';
import { exec, execSync } from 'child_process';
import fetch from 'node-fetch';
import download from 'github-download';
import downloadDirectory from 'github-directory-downloader';
import { Octokit } from 'octokit';
import { compareVersions } from 'compare-versions';
import { getPluginList } from '../utils.js';

const repoOwner = 'VetoExpress';
const repoName = 'veto-plugins';

const githubToken = process.env.GITHUB_TOKEN;
execSync("git config user.name 'github-actions[bot]'");
execSync("git config user.email 'github-actions[bot]@users.noreply.github.com'");
const octokit = new Octokit({
	auth: githubToken,
	userAgent: 'crisissim-plugin-updater'
});

const getPluginCurrentVersion = (id) => {
	const pluginPath = path.resolve(process.cwd(), `../../plugins-data/${id}`);
	if (!fs.existsSync(pluginPath)) return "0";
	const manifest = JSON.parse(fs.readFileSync(path.join(pluginPath, 'manifest.json')));
	return manifest?.version ?? "0";
};

const getPluginListWithCurrentVersion = (pluginList = null) => { // Get plugin list with current version
	if (pluginList === null) {
		pluginList = getPluginList();
	}
	const pluginListWithCurrentVersion = [];
	pluginList.forEach((plugin) => {
		const currentVersion = getPluginCurrentVersion(plugin.id);
		pluginListWithCurrentVersion.push({
			...plugin,
			currentVersion,
		});
	});
	return pluginListWithCurrentVersion;
}

const getPluginLatestVersion = async (plugin) => {
	const url = `https://github.com/${plugin.repo}/raw/${plugin.branch}${plugin.subpath}/manifest.json?${Date.now()}`;
	try {
		const response = await fetch(url, { method: 'GET' });
		if (!response.ok) return "0";
		const manifest = await response.json();
		return manifest?.version ?? "0";
	} catch (error) {
		console.log("\u274c " + error);
		return "0";
	}
};

const updatePlugin = async (plugin) => {
	// search if the pull request already exists
	let searchResult = await octokit.rest.search.issuesAndPullRequests({
		q: `repo:${repoOwner}/${repoName} is:pr is:open "${plugin.id} ${plugin.latestVersion}"`,
	});
	const pullRequestExists = searchResult.data.total_count > 0;
	searchResult = await octokit.rest.search.issuesAndPullRequests({
		q: `repo:${repoOwner}/${repoName} is:pr is:closed "${plugin.id} ${plugin.latestVersion}"`,
	});
	const versionRejected = searchResult.data.total_count > 0;
	if (pullRequestExists) {
		console.log(`📋 Pull request already exists for ${plugin.id} ${plugin.latestVersion}`);
		console.log(`Pushing new commit to update pull request...`);
	}
	if (versionRejected) {
		console.log(`🚫 Pull request already exists for ${plugin.id} ${plugin.latestVersion} and has been closed`);
		return;
	}
	console.log(`  - 🔄 Upgrading...`);
	// create new branch
	execSync(`git checkout main`);
	execSync(`git pull origin main`);
	if (!pullRequestExists) {
		execSync(`git checkout -b update-${plugin.id}-${plugin.latestVersion}`);
	} else {
		try {
			execSync(`git branch -D update-${plugin.id}-${plugin.latestVersion}`);
		} catch (e) {
			execSync(`git checkout main`);
			execSync(`git branch -D update-${plugin.id}-${plugin.latestVersion}`);
		}
		// 重新创建分支
		execSync(`git checkout -b update-${plugin.id}-${plugin.latestVersion}`);
	}

	// if exists, delete
	const pluginPath = path.resolve(process.cwd(), `../../plugins-data/${plugin.id}`);
	if (fs.existsSync(pluginPath)) {
		fs.rmSync(pluginPath, { recursive: true }, (err) => {});
	}
	// download plugin from subpath of given branch of repo
	if (plugin.subpath == '/') {
		await new Promise (resolve => {
			download({
					user: plugin.repo.split('/')[0],
					repo: plugin.repo.split('/')[1],
					ref: plugin.branch
				}, 
				path.resolve(process.cwd(), `../../plugins-data/${plugin.id}`)
			).on('end', function() {
				resolve();
			})
		});
		console.log(`  - 📦 Downloaded ${plugin.id} ${plugin.latestVersion} from ${plugin.repo}#${plugin.branch}`);
	} else {
		const stats = await downloadDirectory(
			`https://github.com/${plugin.repo}/tree/${plugin.branch}${plugin.subpath}`,
			path.resolve(process.cwd(), `../../plugins-data/${plugin.id}`),
			{ token: githubToken }
		);
		console.log(stats);
		console.log(`  - 📦 Downloaded ${plugin.id} ${plugin.latestVersion} from ${plugin.repo}#${plugin.branch}${plugin.subpath}`);
	}
	// .veto-ignore
	const ignorePath = path.resolve(process.cwd(), `../../plugins-data/${plugin.id}/.veto-ignore`);
	if (fs.existsSync(ignorePath)) {
		console.log(`📜 .veto-ignore found`);
		const ignoreContent = fs.readFileSync(ignorePath, 'utf8');
		let ignoreList = ignoreContent.split('\n').filter((line) => line.trim() !== '').map((line) => line.trim());
		ignoreList.push('.veto-ignore');
		for (let i = 0; i < ignoreList.length; i++) {
			let ignoreItem = ignoreList[i];
			ignoreItem = ignoreItem.replace(/\\/g, '/');
			let ignoreItemRegex = ignoreItem.replace(/\*/g, '(.*)');
			ignoreItemRegex = ignoreItemRegex.replace(/\?/g, '(.*)');
			ignoreItemRegex = ignoreItemRegex.replace(/\//g, '\\/');
			if (ignoreItem.startsWith('/')) {
				ignoreItemRegex = '^' + ignoreItemRegex;
			}
			if (!ignoreItem.endsWith('/')) {
				ignoreItemRegex = ignoreItemRegex + '\/?';
			}
			//ignoreItemRegex = ignoreItemRegex + '$';
			ignoreItemRegex = new RegExp(ignoreItemRegex);
			ignoreList[i] = ignoreItemRegex;
		}
		console.log('📜 Rules: ' + ignoreList);
		const satisifyIgnoreList = (path) => {
			for (let i = 0; i < ignoreList.length; i++) {
				const ignoreItemRegex = ignoreList[i];
				if (ignoreItemRegex.test(path)) {
					return true;
				}
			}
			return false;
		}
		const iterate = (dir) => {
			const files = fs.readdirSync(dir);
			for (const file of files) {
				const filePath = path.resolve(dir, file);
				const isDirectory = fs.statSync(filePath).isDirectory();
				const relativePath = ('/' + path.relative(pluginPath, filePath) + (isDirectory ? '/' : '')).replace(/\\/g, '/');
				if (satisifyIgnoreList(relativePath)) {
					if (isDirectory) {
						fs.rmSync(filePath, { recursive: true }, (err) => {});
					} else {
						fs.unlinkSync(filePath);
					}
					console.log('🗑️ Ignored', relativePath);
					continue;
				}
				if (isDirectory) {
					iterate(filePath);
				}
			}
		}
		iterate(pluginPath);
	}
	// get last commit hash
	const commitInfoJson = path.resolve(process.cwd(), `../../commit-info/${plugin.id}.json`);
	let lastCommitHash = '';
	if (fs.existsSync(commitInfoJson)) {
		const commitInfo = JSON.parse(fs.readFileSync(commitInfoJson, 'utf8'));
		lastCommitHash = commitInfo.lastCommitHash;
	}
	// get current commit hash
	let currentCommitHash = '', defaultBranch = '';
	try {
		defaultBranch = (await octokit.request(`GET /repos/${plugin.repo.split('/')[0]}/${plugin.repo.split('/')[1]}`, {
			owner: plugin.repo.split('/')[0],
			repo: plugin.repo.split('/')[1],
		})).data.default_branch;
		currentCommitHash = (await octokit.request(`GET /repos/${plugin.repo.split('/')[0]}/${plugin.repo.split('/')[1]}/commits`, {
			owner: plugin.repo.split('/')[0],
			repo: plugin.repo.split('/')[1],
			ref: defaultBranch
		})).data[0].sha;
	} catch (error) {
		console.log("❌ " + error);
	}
	console.log(`🔀 commit hash: ${lastCommitHash.substring(0, 7)} -> ${currentCommitHash.substring(0, 7)}`);
	// get manifest
	const manifestPath = path.resolve(process.cwd(), `../../plugins-data/${plugin.id}/manifest.json`);
	if (!fs.existsSync(manifestPath)) {
		console.log(`❌ manifest.json not found`);
		return;
	}
	const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
	// write commit info
	if (!fs.existsSync(commitInfoJson)) {
		fs.writeFileSync(commitInfoJson, JSON.stringify({
			lastCommitHash: currentCommitHash
		}));
	} else {
		const commitInfo = JSON.parse(fs.readFileSync(commitInfoJson, 'utf8'));
		commitInfo.lastCommitHash = currentCommitHash;
		fs.writeFileSync(commitInfoJson, JSON.stringify(commitInfo));
	}

	// commit
	execSync(`git add --all`);
	execSync(`git commit -m "Update ${plugin.id} to ${plugin.latestVersion}"`);
	// push
	execSync(`git push --force origin update-${plugin.id}-${plugin.latestVersion}`);
	// create pull request
	if (pullRequestExists) {
		console.log(`🔼 The branch for PR has been updated`);
		return;
	}
	let body = `\`${plugin.currentVersion}\` -> \`${plugin.latestVersion}\`\n\n`;
	body += `Repo: https://github.com/${plugin.repo}/\n\n`;
	body += `[🔀 Compare changes](https://github.com/${plugin.repo}/compare/${lastCommitHash.substring(0, 7)}...${defaultBranch})`;
	const { data: pullRequest } = await octokit.rest.pulls.create({
		owner: repoOwner,
		repo: repoName,
		title: `Update ${plugin.name ?? plugin.id} to ${plugin.latestVersion}`,
		body: body,
		head: `update-${plugin.id}-${plugin.latestVersion}`,
		base: 'main'
	});
	console.log(`  - 📝 Pull request created: ${pullRequest.html_url}`);
};

const updateAllPlugins = async (plugins = null) => {
	if (plugins == null) {
		plugins = getPluginListWithCurrentVersion();
	}

	console.log("🔌 Plugin list:");

	for (const plugin of plugins) {
		console.log(`- ${plugin.name ?? plugin.id} (${plugin.id})`);
		console.log(`  - Current version: ${plugin.currentVersion}`);
		plugin.latestVersion = await getPluginLatestVersion(plugin);
		console.log(`  - Latest version: ${plugin.latestVersion}`);
		if (compareVersions(plugin.latestVersion, plugin.currentVersion) > 0) {
			console.log(`  - ⏫ Has update!`);
			try{
			    await updatePlugin(plugin);
			}catch(e){
			    console.error(`    - 🔴 Failed to update plugin: ${e}`);
			}
		} else {
			console.log(`  - ✅ No update`);
		}
	}
	execSync(`git checkout main`);
}
await updateAllPlugins();
