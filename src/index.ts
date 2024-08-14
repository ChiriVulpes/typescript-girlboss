import type { } from "ts-expose-internals";
import type { PluginConfig, ProgramTransformerExtras } from "ts-patch";
import ts from "typescript";
import LanguageServicePlugin from "./LanguageServicePlugin";
import { transformProgram } from "./transformProgram";

interface EntryPoint {
	(modules: { typescript: typeof ts }): { create (info: ts.server.PluginCreateInfo): LanguageServicePlugin };
	default (program: ts.Program, host: ts.CompilerHost | undefined, config: PluginConfig, extras: ProgramTransformerExtras): ts.Program;
}

const createLanguageServicePlugin = ((modules: { typescript: typeof ts }) => ({
	create: (info: ts.server.PluginCreateInfo) => new LanguageServicePlugin(modules.typescript as any, info),
})) as Partial<EntryPoint>;

createLanguageServicePlugin.default = transformProgram;

export = createLanguageServicePlugin;
