export default `{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "target": "es2021",
    "module": "es2022",
    "lib": ["dom", "esnext"],
    "strict": true,
    "strictPropertyInitialization": false, // to enable generic constructors, e.g. on CircuitValue
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "moduleResolution": "node",
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
  // Path aliases are handled by https://kit.svelte.dev/docs/configuration#alias
  //
  // If you want to overwrite includes/excludes, make sure to copy over the relevant includes/excludes
  // from the referenced tsconfig.json - TypeScript does not merge them in
}
`;
