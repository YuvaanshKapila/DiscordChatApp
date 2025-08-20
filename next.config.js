/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    appDir: true,
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: 'https://khrdioffvpjsqytcxler.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocmRpb2ZmdnBqc3F5dGN4bGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NjkyMzEsImV4cCI6MjA3MTI0NTIzMX0.QXXcrRZBeguR_HRXy8kObbEUHh8wwxnnHYTSFNm2FdA',
    NEXT_PUBLIC_SOCKET_URL: 'http://localhost:3001' // Change to LAN IP if accessing from another device
  }
};

module.exports = nextConfig;
