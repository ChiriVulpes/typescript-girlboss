import ts from "typescript";
import Config, { GirlbossPluginConfig } from "./Config";

export interface GirlbossASTTransformationAPI {
	/**
	 * The current node.
	 */
	node: ts.Node;
	/**
	 * Call this function when you need to replace a descendant node of the current node with a new node.
	 */
	queueNodeReplacement (oldNode: ts.Node, newNode: ts.Node): void;
}

export type GirlbossASTTransformer = (api: GirlbossASTTransformationAPI) => ts.Node | undefined | void;

export type GirlbossDiagnosticFilter = (diagnostic: ts.Diagnostic) => any;

export interface GirlbossDiagnosticsTransformerAPI {
	/**
	 * The current node.
	 */
	readonly node: ts.Node;
	/**
	 * All diagnostics for the program.
	 */
	readonly allDiagnostics: ts.Diagnostic[];
	/**
	 * Returns a filtered list of diagnostics that are exactly match this node's range.
	 */
	getNodeDiagnostics (): ts.Diagnostic[];
	/**
	 * Remove diagnostics for the given node.
	 * @param node The node to remove diagnostics on
	 * @param filter An optional filter that returns a truthy value for any diagnostics that should be removed
	 */
	removeNodeDiagnostics (node: ts.Node, filter?: GirlbossDiagnosticFilter): void;
	/**
	 * Remove diagnostics for the current node.
	 * @param filter An optional filter that returns a truthy value for any diagnostics that should be removed
	 */
	removeNodeDiagnostics (filter?: GirlbossDiagnosticFilter): void;
}

export type GirlbossDiagnosticsTransformer = (api: GirlbossDiagnosticsTransformerAPI) => ts.Diagnostic[] | undefined | void;

interface GirlbossPlugin {
	/**
	 * Return a new source file to replace the current source file.
	 * Return `undefined` (or nothing) to keep the current source file.
	 */
	transformSourceFile?(sourceFile: ts.SourceFile): ts.SourceFile | undefined | void;
	/**
	 * Return a new node to replace the current node.
	 * Return `undefined` (or nothing) to keep the current node.
	 */
	transformAST?: GirlbossASTTransformer;
	/**
	 * Return a list of diagnostics to replace the current program diagnostics list.
	 * Return `undefined` (or nothing) to keep the current diagnostics list.
	 */
	transformDiagnostics?: GirlbossDiagnosticsTransformer;
}

namespace GirlbossPlugin {

	let languageServerPlugins: GirlbossPlugin[] | undefined;
	let programTransformerPlugins: GirlbossPlugin[] | undefined;

	export function getLanguageServerPlugins (): readonly GirlbossPlugin[] {
		return languageServerPlugins ??= loadAll(Config.getLanguageServerPlugins());
	}

	export function getProgramTransformerPlugins (): readonly GirlbossPlugin[] {
		return programTransformerPlugins ??= loadAll(Config.getProgramTransformerPlugins());
	}

	function loadAll (configs: readonly GirlbossPluginConfig[]): GirlbossPlugin[] {
		return configs.map(load).filter(plugin => !!plugin);
	}

	function load (config: GirlbossPluginConfig): GirlbossPlugin | undefined {
		const reqFrom = config?.name ?? config?.path;
		if (!reqFrom) {
			console.warn("Girlboss plugin provided that has no name or path");
			return undefined;
		}

		const modulePath = require.resolve(reqFrom, { paths: [process.cwd()] });

		try {
			const module = require(modulePath);
			return module.default ?? module;
		} catch (err) {
			console.warn("Error loading girlboss plugin", err);
			return undefined;
		}
	}
}

export default GirlbossPlugin;
