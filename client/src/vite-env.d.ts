/// <reference types="vite/client" />

/**
 * Type declarations for Vite environment variables
 * This provides proper typing for import.meta.env
 */
interface ImportMetaEnv {
  readonly VITE_DEV_BYPASS_AUTH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
