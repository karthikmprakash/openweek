import fs from "fs";
import path from "path";

export default function globalSetup() {
  const file = path.join(process.cwd(), "data", "e2e.sqlite");
  for (const suffix of ["", "-wal", "-shm"]) fs.rmSync(file + suffix, { force: true });
}
