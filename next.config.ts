import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 상위 디렉터리에 다른 lockfile 이 있어 workspace root 가 잘못 추론되는 것을 막는다.
  turbopack: {
    root: path.resolve(__dirname),
  },
  // 모노레포 workspace 패키지는 Next 가 직접 트랜스파일해야 한다(TS 소스 그대로 import).
  transpilePackages: ["@sketchbook/renderer"],
};

export default nextConfig;
