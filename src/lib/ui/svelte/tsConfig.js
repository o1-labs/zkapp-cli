export default `{
  // SvelteKit 3 requires the project to extend its built-in configuration.
  // It sets the module resolution and the path aliases.
  "extends": "$app/tsconfig",
  "compilerOptions": {
    "target": "es2021",
    "lib": ["dom", "esnext"],
    "strict": true,
    "strictPropertyInitialization": false, // to enable generic constructors, e.g. on CircuitValue
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "allowJs": true,
    "declaration": true,
    "sourceMap": true,
    "noFallthroughCasesInSwitch": true,
    "allowSyntheticDefaultImports": true,
    "isolatedModules": true,
    "useDefineForClassFields": false,
    "importHelpers": true,
  },
  // TypeScript does not merge "include" from the extended configuration.
  "include": ["src", "vite.config.ts"]
}
`;
