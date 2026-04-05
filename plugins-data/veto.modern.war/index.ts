import branchesJson from './assets/branches.json';
import categoriesJson from './assets/categories.json';
import i18nJson from './assets/i18n/zh-CN.json';
import groundForceTemplates from './assets/unitTemplates/ground-force-templates.json';
import spaceFleetTemplates from './assets/unitTemplates/space-fleet-templates.json';
import aerospaceTemplates from './assets/unitTemplates/aerospace-templates.json';
import mainManifest from './manifest.json';

export const baseGameData: ModData = {
	id: mainManifest.id,
	name: mainManifest.name,
	version: mainManifest.version,
	branches: branchesJson,
	categories: categoriesJson as ModData['categories'],
	unitTemplates: [...groundForceTemplates, ...spaceFleetTemplates, ...aerospaceTemplates] as unknown as ModData['unitTemplates'],
	i18n: i18nJson
};


