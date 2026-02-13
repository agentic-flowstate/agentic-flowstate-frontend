import type { NextConfig } from 'next'

const config: NextConfig = {
    generateEtags: false,
    poweredByHeader: false,
    // Allow cross-origin requests from Tailscale network in dev mode
    allowedDevOrigins: [
        'http://100.119.87.128:3000',
        'http://jarviss-mac-mini-1:3000',
        'http://jarviss-mac-mini:3000',
        'http://localhost:3000',
        'http://jarviss-mac-mini-1.tail3da916.ts.net:3000',
        'https://jarviss-mac-mini-1.tail3da916.ts.net',
        'https://jarviss-mac-mini-1.tail3da916.ts.net:3000',
    ],
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