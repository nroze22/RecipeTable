/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_RECIPE_WORKER_URL?: string;
  readonly VITE_ENABLE_AI_COMPILER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

