import { PluginConfig } from "ts-patch";
import ts from "typescript";

export interface GirlbossPluginConfig {
	name?: string;
	path?: string;
}

export interface GirlbossConfig {
	plugins?: GirlbossPluginConfig[];
}

namespace Config {
	let resolvedLanguageServerPlugins: GirlbossPluginConfig[] | undefined;
	let resolvedProgramTransformerPlugins: GirlbossPluginConfig[] | undefined;

	export function initialise (compilerOptions: ts.CompilerOptions) {
		const typescriptPlugins: PluginConfig[] = compilerOptions.plugins ?? [];
		const languageServerConfig = typescriptPlugins.find(plugin => plugin.name === "typescript-girlboss") as GirlbossConfig | undefined;
		const programTransformerConfig = typescriptPlugins.find(plugin => plugin.transform === "typescript-girlboss") as GirlbossConfig | undefined;
		const languageServerPlugins = languageServerConfig?.plugins;
		const programTransformerPlugins = programTransformerConfig?.plugins;
		const allPlugins = !(languageServerPlugins && programTransformerPlugins) ? [...languageServerPlugins ?? [], ...programTransformerPlugins ?? []] : undefined;
		resolvedLanguageServerPlugins = allPlugins ?? languageServerPlugins ?? [];
		resolvedProgramTransformerPlugins = allPlugins ?? programTransformerPlugins ?? [];
	}

	export function getLanguageServerPlugins (): readonly GirlbossPluginConfig[] {
		return resolvedLanguageServerPlugins ?? [];
	}

	export function getProgramTransformerPlugins (): readonly GirlbossPluginConfig[] {
		return resolvedProgramTransformerPlugins ?? [];
	}
}

export default Config;
