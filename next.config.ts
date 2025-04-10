import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
    reactStrictMode: true,
    output: 'export',
    eslint: {
        // ВНИМАНИЕ: Это полностью отключит проверку ESLint во время 'next build'.
        ignoreDuringBuilds: true,
    },
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
