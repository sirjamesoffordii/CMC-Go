import { execSync } from "node:child_process";

function run(cmd, env) {
  execSync(cmd, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
    },
  });
}

const env = {
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "mysql://root:rootpassword@127.0.0.1:3306/cmcgo",
  APP_ENV: process.env.APP_ENV ?? "local",
  NODE_ENV: process.env.NODE_ENV ?? "test",
};

run("node scripts/aeos/wait-mysql.mjs", env);
run("pnpm db:push:yes", env);
run("pnpm db:seed", env);
run("pnpm test", env);
