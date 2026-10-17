import type { NextConfig } from "next";
import {execFileSync} from "node:child_process";
const release=process.env.RENDER_GIT_COMMIT||execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();

const nextConfig: NextConfig = {
  env: {NEXT_PUBLIC_PICKR_RELEASE:release},
};

export default nextConfig;
