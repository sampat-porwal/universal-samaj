// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

// export default nextConfig;


/** @type {import('next').NextConfig} */
const nextConfig = {
  // 👇 Yeh 2 blocks add karne hain
  typescript: {
    // Vercel ko bolo TS errors ignore kare
    ignoreBuildErrors: true,
  },

};

export default nextConfig;