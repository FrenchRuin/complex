import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// dotenv/config는 기본적으로 .env만 읽고 .env.local은 안 읽으므로 명시적으로 로드
config({ path: ".env.local" });

// prisma migrate/studio 등 CLI 작업은 Supavisor 풀러를 거치지 않는 직접 연결(DIRECT_URL) 사용
// env()는 값이 없으면 즉시 throw하므로(`prisma generate`처럼 DB가 필요 없는 명령까지 막힘) process.env를 직접 사용
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DIRECT_URL,
  },
});
