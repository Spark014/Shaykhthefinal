
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'gttaezkajtccvebrrbng.supabase.co', // Existing Supabase storage for other potential images
        pathname: '/storage/v1/object/public/**', 
      },
      { // For Internet Archive images
        protocol: 'https',
        hostname: 'ia.us.archive.org',
        pathname: '/**',
      },
      { // For Internet Archive images (alternative domain sometimes used)
        protocol: 'https',
        hostname: 'archive.org',
        pathname: '/**',
      },
      { // For Internet Archive images (BookReader specific or another subdomain)
        protocol: 'https',
        hostname: 'ia903401.us.archive.org',
        pathname: '/**',
      },
      { // Added for the specific error encountered
        protocol: 'https',
        hostname: 'ia801800.us.archive.org',
        pathname: '/**',
      },
      { // Added for the new error
        protocol: 'https',
        hostname: 'ia601800.us.archive.org',
        pathname: '/**',
      },
      { // For your specific archive.org subdomain
        protocol: 'https',
        hostname: 'ia803403.us.archive.org',
        pathname: '/**',
      },
      { // For the new subdomain mentioned in error
        protocol: 'https',
        hostname: 'ia903403.us.archive.org',
        pathname: '/**',
      },
      // Add other hostnames if admins will paste cover image URLs from various sources
      // For example, if they use imgur.com:
      // {
      //   protocol: 'https',
      //   hostname: 'i.imgur.com',
      //   pathname: '/**',
      // },
    ],
  },
};

export default nextConfig;
