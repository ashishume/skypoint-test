/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEMO_HR_EMAIL?: string;
  readonly VITE_DEMO_HR_PASSWORD?: string;
  readonly VITE_DEMO_CANDIDATE_EMAIL?: string;
  readonly VITE_DEMO_CANDIDATE_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
