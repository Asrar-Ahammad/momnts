import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'pwa-192x192.png', 'pwa-512x512.png'],
            manifest: {
                name: 'Momnts — AI Event Photo Sharing',
                short_name: 'Momnts',
                description: 'Upload event photos, find every face, relive every moment. AI-powered photo sharing for events.',
                theme_color: '#0a0a0a',
                background_color: '#0a0a0a',
                display: 'standalone',
                orientation: 'portrait',
                scope: '/',
                start_url: '/',
                categories: ['photo', 'social', 'entertainment'],
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable',
                    },
                ],
                screenshots: [],
            },
            workbox: {
                // Cache pages the user navigates to
                navigateFallback: 'index.html',
                navigateFallbackAllowlist: [/^(?!\/__).*/],
                runtimeCaching: [
                    // Cache API responses for events (stale-while-revalidate)
                    {
                        urlPattern: /\/api\/events\/.*/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'momnts-events-cache',
                            expiration: {
                                maxEntries: 50,
                                maxAgeSeconds: 60 * 60 * 24, // 1 day
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    // Cache API responses for photos metadata
                    {
                        urlPattern: /\/api\/photos\/.*/i,
                        handler: 'StaleWhileRevalidate',
                        options: {
                            cacheName: 'momnts-photos-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24, // 1 day
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    // Cache notification data
                    {
                        urlPattern: /\/api\/notifications.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'momnts-notifications-cache',
                            expiration: {
                                maxEntries: 5,
                                maxAgeSeconds: 60 * 5, // 5 minutes
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    // Cache images from S3/CDN (photo thumbnails, display images)
                    {
                        urlPattern: /\.(?:png|jpg|jpeg|webp|gif|svg)$/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'momnts-images-cache',
                            expiration: {
                                maxEntries: 200,
                                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    // Cache Google Fonts
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'momnts-google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'momnts-gstatic-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                            },
                            cacheableResponse: {
                                statuses: [0, 200],
                            },
                        },
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    build: {
        outDir: "build",
        chunkSizeWarningLimit: 1000,
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("node_modules/react") || id.includes("node_modules/react-dom")) {
                        return "vendor";
                    }
                    if (id.includes("node_modules/react-router")) {
                        return "router";
                    }
                    if (id.includes("node_modules/@tanstack")) {
                        return "query";
                    }
                    if (id.includes("node_modules/@radix-ui")) {
                        return "ui";
                    }
                },
            },
        },
    },
});
