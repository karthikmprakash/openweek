import next from "eslint-config-next/core-web-vitals";

const config = [
  { ignores: ["replica/**", "tools/**", ".claude/**", "data/**", "node_modules/**", ".next/**", "scripts/**", "e2e/**", "tests/**"] },
  ...next,
];

export default config;
