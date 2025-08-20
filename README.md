# Realtime Chat App

A modern, real-time chat application built with Next.js, Supabase, and WebSockets featuring user authentication, real-time messaging, and typing indicators.

## Features

- User Authentication with Supabase Auth
- Real-time Messaging using Supabase Realtime
- User Profiles with customizable usernames
- Typing Indicators
- Responsive Design for desktop and mobile

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React

## Quick Start

### 1. Supabase Setup

1. Go to [Supabase Dashboard](https://khrdioffvpjsqytcxler.supabase.co) and enable Email authentication.
2. In **SQL Editor**, run this setup script:

```sql
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Messages are viewable by everyone" ON messages FOR SELECT USING (true);
CREATE POLICY "Users can insert messages" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
### 2. Local Development

# Clone or create the project
mkdir realtime-chat-app
cd realtime-chat-app

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Start development server
npm run dev

### How It Works

Users register/login via Supabase Auth.

Messages are stored in PostgreSQL and synchronized in real-time.

Profiles are automatically created on signup with customizable usernames.

Messages persist and load on page refresh.
