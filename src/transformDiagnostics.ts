
import type { } from "ts-expose-internals";
import ts from "typescript";
import GirlbossPlugin, { GirlbossDiagnosticFilter, GirlbossDiagnosticsTransformerAPI } from "./Plugin";

export default function (diagnostics: ts.Diagnostic[], plugins: readonly GirlbossPlugin[]) {
	let api: GirlbossDiagnosticsTransformerAPI | undefined;

	const files = new Set(diagnostics.map(diagnostic => diagnostic.file).filter((file): file is ts.SourceFile => !!file));

	for (const file of files) {
		api = {
			node: file,
			allDiagnostics: diagnostics,
			getNodeDiagnostics () {
				const start = this.node.getStart();
				const end = this.node.getEnd();
				return diagnostics.filter(diagnostic => false
					|| diagnostic.file !== file
					|| diagnostic.start !== start
					|| diagnostic.length !== end - start);
			},
			removeNodeDiagnostics (node?: ts.Node | GirlbossDiagnosticFilter, filter?: GirlbossDiagnosticFilter) {
				if (typeof node === "function") {
					filter = node;
					node = undefined;
				}

				node ??= this.node;

				const start = node.getStart();
				const end = node.getEnd();

				(api as any).allDiagnostics = diagnostics = diagnostics.filter(diagnostic => false
					// keep any unrelated diagnostics
					|| diagnostic.file !== file
					|| diagnostic.start !== start
					|| diagnostic.length !== end - start
					// remove all diagnostics for this node if no filter, otherwise remove diagnostics that satisfy the filter
					|| (!filter ? false : !filter?.(diagnostic)));
			},
		};

		ts.transform(file, [() => visit]);
	}

	function visit (node: ts.Node): ts.Node {
		(api as any).node = node;

		for (const plugin of plugins)
			(api as any).allDiagnostics = diagnostics = plugin.transformDiagnostics?.(api!) ?? diagnostics;

		return ts.visitEachChild(node, visit, undefined);
	}

	return diagnostics;
}
