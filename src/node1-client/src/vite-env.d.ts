/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STUDENT_SERVICE_URL?: string;
  readonly VITE_COURSE_SERVICE_URL?: string;
  readonly VITE_KRS_SERVICE_URL?: string;
  readonly VITE_SCHEDULE_SERVICE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
