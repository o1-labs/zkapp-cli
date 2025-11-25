export default `{
  "compilerOptions": {
    "target": "es2021",
    "module": "esnext",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "strictPropertyInitialization": false, // to enable generic constructors, e.g. on CircuitValue
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "moduleResolution": "bundler",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "allowJs": true,
    "declaration": false,
    "sourceMap": true,
    "noFallthroughCasesInSwitch": true,
    "allowSyntheticDefaultImports": true,
    "isolatedModules": true,
    "noEmit": true,
    "incremental": true,
    "resolveJsonModule": true,
    "jsx": "preserve",
    "useDefineForClassFields": false,
    "importHelpers": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`;
