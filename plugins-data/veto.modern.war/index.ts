import branchesJson from './assets/branches.json';
import categoriesJson from './assets/categories.json';
import i18nJson from './assets/i18n/zh-CN.json';
import armyTemplates from './assets/unitTemplates/army-templates.json';
import navyTemplates from './assets/unitTemplates/navy-templates.json';
import airForceTemplates from './assets/unitTemplates/air-force-templates.json';
import mainManifest from './manifest.json';

export const baseGameData: ModData = {
	id: mainManifest.id,
	name: mainManifest.name,
	version: mainManifest.version,
	branches: branchesJson,
	categories: categoriesJson as ModData['categories'],
	unitTemplates: [...armyTemplates, ...navyTemplates, ...airForceTemplates] as unknown as ModData['unitTemplates'],
	i18n: i18nJson
};

