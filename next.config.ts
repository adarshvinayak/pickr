import type { NextConfig } from "next";
import {execFileSync} from "node:child_process";
const release=process.env.RENDER_GIT_COMMIT||execFileSync("git",["rev-parse","HEAD"],{encoding:"utf8"}).trim();

const nextConfig: NextConfig = {
  async rewrites(){return {beforeFiles:[],afterFiles:[{source:'/customer-app/:path*',destination:'/customer-app/index.html'}],fallback:[]};},
  env: {NEXT_PUBLIC_PICKR_RELEASE:release},
};

export default nextConfig;
