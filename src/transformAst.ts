
import type { } from "ts-expose-internals";
import ts, { Node, SourceFile, TransformationContext } from "typescript";
import GirlbossPlugin, { GirlbossASTTransformationAPI } from "./Plugin";

export default function transformAst (this: typeof ts, plugins: readonly GirlbossPlugin[], context: TransformationContext) {
	const tsInstance = this;

	return (sourceFile: SourceFile) => {
		for (const plugin of plugins)
			sourceFile = plugin.transformSourceFile?.(sourceFile) ?? sourceFile;

		const queuedReplacements = new Map<Node, Node>();
		const api: GirlbossASTTransformationAPI = {
			node: sourceFile,
			queueNodeReplacement: (oldNode, newNode) => queuedReplacements.set(oldNode, newNode),
		};
		return tsInstance.visitEachChild(sourceFile, visit, context);

		function visit (node: Node): Node {
			const oldNode = node;
			node = queuedReplacements.get(node) ?? node;
			queuedReplacements.delete(oldNode);

			api.node = node;

			for (const plugin of plugins)
				api.node = node = plugin.transformAST?.(api) ?? node;

			return ts.visitEachChild(node, visit, context);
		}
	}
}
