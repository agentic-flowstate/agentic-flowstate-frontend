import type { NextConfig } from 'next'

const config: NextConfig = {
    generateEtags: false,
    poweredByHeader: false,
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://localhost:5001/api/:path*'
            }
        ]
    }
}

export default config