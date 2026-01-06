import type { NextConfig } from 'next'

const config: NextConfig = {
    generateEtags: false,
    poweredByHeader: false,
    // Aggressive cache busting for development
    headers: async () => [
        {
            source: '/:path*',
            headers: [
                {
                    key: 'Cache-Control',
                    value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0'
                },
                {
                    key: 'Pragma',
                    value: 'no-cache'
                },
                {
                    key: 'Expires',
                    value: '0'
                },
                {
                    key: 'Surrogate-Control',
                    value: 'no-store'
                }
            ]
        }
    ],
    // Disable static optimization to prevent caching issues
    experimental: {
        // Add experimental features here if needed
    },
    // Add timestamp to build IDs in development
    generateBuildId: async () => {
        return `build-${Date.now()}`
    }
}

export default config