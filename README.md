# typescript-girlboss
Time to gaslight typescript! :3

This module provides both a TypeScript Language Server plugin, and a [ts-patch](https://github.com/nonara/ts-patch) plugin. It does nothing on its own, but it provides its own plugin framework for interacting and editing the TypeScript AST and diagnostics using the same code. 

Here's an example `tsconfig.json` with `typescript-girlboss` plugins:
```json
{
	"compilerOptions": {
		// ...other options...
		"plugins": [
			{ 
				"name": "typescript-girlboss", 
				"plugins": [
					{ "name": "typescript-ignore-leftmost-nullish-literal-errors" },
				],
			},
			{ "transform": "typescript-girlboss/transform", "transformProgram": true },
		]
	}
}
```

For an example plugin, see [`typescript-ignore-leftmost-nullish-literal-errors`](https://github.com/ChiriVulpes/typescript-ignore-leftmost-nullish-literal-errors).

And for all options on what a plugin can do, see the main interface in [`GirlbossPlugin`](https://github.com/ChiriVulpes/typescript-girlboss/blob/main/src/Plugin.ts).
