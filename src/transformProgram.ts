import type { } from "ts-expose-internals";
import { PluginConfig, ProgramTransformerExtras } from "ts-patch";
import ts, { CompilerHost, CompilerOptions, Diagnostic, Program, SourceFile } from "typescript";
import Config from "./Config";
import GirlbossPlugin from "./Plugin";
import transformAst from "./transformAst";
import transformDiagnostics from "./transformDiagnostics";

export default function transformProgram (
	program: Program,
	host: CompilerHost | undefined,
	config: PluginConfig,
	{ ts: tsInstance }: ProgramTransformerExtras,
): Program {
	const compilerOptions = program.getCompilerOptions();
	Config.initialise(compilerOptions);

	const compilerHost = getPatchedHost(host, tsInstance, compilerOptions);
	const rootFileNames = program.getRootFileNames().map(tsInstance.normalizePath);
	const sourceFiles = program.getSourceFiles();

	const plugins = GirlbossPlugin.getProgramTransformerPlugins();

	const transformedSource = tsInstance.transform(
		sourceFiles.filter(sourceFile => rootFileNames.includes(sourceFile.fileName)),
		[transformAst.bind(tsInstance, plugins)],
		compilerOptions,
	).transformed;

	for (const sourceFile of transformedSource)
		compilerHost.fileCache.set(sourceFile.fileName, sourceFile);

	const newProgram = tsInstance.createProgram(rootFileNames, compilerOptions, compilerHost);
	for (const key of Object.keys(newProgram))
		(program as any)[key] = (newProgram as any)[key];

	applyDiagnosticsTransformer(program, "getSemanticDiagnostics", plugins);
	applyDiagnosticsTransformer(program, "getBindAndCheckDiagnostics", plugins);

	return program;
}

function applyDiagnosticsTransformer<PROGRAM extends ts.Program | ts.BuilderProgram> (program: PROGRAM, getDiagnosticType: keyof PROGRAM, plugins: readonly GirlbossPlugin[]) {
	type DiagnosticFunction = (...args: never[]) => Diagnostic[];
	const originalGetDiagnostics = (program[getDiagnosticType] as DiagnosticFunction).bind(program);
	(program[getDiagnosticType] as DiagnosticFunction) = (...params) => {
		const diagnostics = originalGetDiagnostics(...params)?.slice();
		return transformDiagnostics(diagnostics as Diagnostic[], plugins);
	};
}

function getPatchedHost (
	maybeHost: CompilerHost | undefined,
	tsInstance: typeof ts,
	compilerOptions: CompilerOptions
): CompilerHost & { fileCache: Map<string, SourceFile> } {
	const fileCache = new Map();
	const compilerHost = maybeHost ?? tsInstance.createCompilerHost(compilerOptions, true);
	const originalGetSourceFile = compilerHost.getSourceFile;

	return Object.assign(compilerHost, {
		getSourceFile (fileName: string, languageVersion: ts.ScriptTarget) {
			fileName = tsInstance.normalizePath(fileName);
			if (fileCache.has(fileName)) return fileCache.get(fileName);

			const sourceFile = originalGetSourceFile.apply(void 0, Array.from(arguments) as any);
			fileCache.set(fileName, sourceFile);

			return sourceFile;
		},
		fileCache
	});
}
