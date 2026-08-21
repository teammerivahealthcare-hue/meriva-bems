import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Verification builds (Claude's own build/start cycles for testing changes)
  // set VERIFY_DIST_DIR so they never touch the .next directory a live
  // `next dev` server on this machine is using -- sharing one corrupted the
  // dev server's routing manifest once already.
  distDir: process.env.VERIFY_DIST_DIR || ".next",
};

export default nextConfig;
