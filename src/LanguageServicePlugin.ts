import type { } from "ts-expose-internals";
import ts from "typescript";
import Config from "./Config";
import GirlbossPlugin from "./Plugin";
import transformAst from "./transformAst";
import transformDiagnostics from "./transformDiagnostics";

export default class LanguageServicePlugin {

	private sourceFileCache: Record<string, { sourceFile: ts.SourceFile, transformedFile: ts.SourceFile }> = {};

	public constructor (
		private readonly tslib: typeof import("typescript/lib/tsserverlibrary"),
		private readonly info: ts.server.PluginCreateInfo,
	) {
		const program = info.languageService.getProgram();
		if (!program)
			return;

		const compilerOptions = program.getCompilerOptions();
		Config.initialise(compilerOptions);

		const plugins = GirlbossPlugin.getLanguageServerPlugins();

		const originalGetSemanticDiagnostics = info.languageService.getSemanticDiagnostics.bind(info.languageService);
		info.languageService.getSemanticDiagnostics = (fileName) => {
			const diagnostics = originalGetSemanticDiagnostics(fileName).slice();
			return transformDiagnostics(diagnostics, plugins);
		};

		const originalfn = info.languageServiceHost.setCompilerHost?.bind(program);
		info.languageServiceHost.setCompilerHost = (compilerHost: ts.CompilerHost) => {
			this.tryInjectCompilerHost(compilerHost);
			return originalfn?.(compilerHost);
		};
	}

	private injectedCompilerHost?: ts.CompilerHost;
	private tryInjectCompilerHost (compilerHost: ts.CompilerHost) {
		if (!compilerHost || this.injectedCompilerHost === compilerHost)
			return;

		const originalGetSourceFileByPath = compilerHost.getSourceFileByPath;
		if (!originalGetSourceFileByPath)
			return;

		const originalGetSourceFile = compilerHost.getSourceFile;
		if (!originalGetSourceFile)
			return;

		this.injectedCompilerHost = compilerHost;

		compilerHost.getSourceFileByPath = (fileName, path, languageVersionOrOptions, onError) => {
			const previous = this.sourceFileCache[fileName];

			const sourceFile = originalGetSourceFileByPath(fileName, path, languageVersionOrOptions, onError);
			if (!sourceFile) {
				if (previous)
					delete this.sourceFileCache[fileName];

				return undefined;
			}

			return this.getTransformedSourceFile(sourceFile);
		};

		compilerHost.getSourceFile = (fileName, languageVersionOrOptions, onError) => {
			const previous = this.sourceFileCache[fileName];

			const sourceFile = originalGetSourceFile(fileName, languageVersionOrOptions, onError);
			if (!sourceFile) {
				if (previous)
					delete this.sourceFileCache[fileName];

				return undefined;
			}

			return this.getTransformedSourceFile(sourceFile);
		};
	}

	private getTransformedSourceFile (sourceFile: ts.SourceFile) {
		if (sourceFile.fileName.includes("node_modules"))
			return sourceFile;

		try {
			const program = this.info.languageService.getProgram();
			const compilerOptions = program?.getCompilerOptions();

			const previous = this.sourceFileCache[sourceFile.fileName];
			if (previous && previous.sourceFile === sourceFile)
				return previous.transformedFile;

			const result = ts.transform(
				sourceFile,
				[transformAst.bind(this.tslib as any, GirlbossPlugin.getLanguageServerPlugins())],
				compilerOptions
			);
			const transformedFile = result.transformed[0];

			this.sourceFileCache[sourceFile.fileName] = {
				sourceFile,
				transformedFile,
			};

			return transformedFile;
		} catch (err) {
			return sourceFile;
		}
	}
}
