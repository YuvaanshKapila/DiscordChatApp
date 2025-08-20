# Realtime Chat App

A realtime chat application built with React, Supabase, and Socket.io.  
Users can register, log in, and send messages instantly with WebSocket support.  
Messages are stored in Supabase and persist across refreshes.

## Features
- User authentication (login and register with Supabase Auth)
- Realtime group chat with Socket.io
- Persistent message storage in Supabase
- Auto-refresh and instant message delivery

## Tech Stack
- Frontend: React, TailwindCSS
- Backend: Node.js + Socket.io
- Database + Auth: Supabase

## Getting Started
1. Clone this repo  
   ```bash
   git clone https://github.com/yourusername/realtime-chat.git
   cd realtime-chat
## Install dependencies

npm install


Add your Supabase URL and Anon Key to .env.local.

Start the development server

npm run dev

## Roadmap

Direct messages (DMs)

Online user indicators

Message reactions and typing indicators

Profile pictures and usernames
