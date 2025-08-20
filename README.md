# Realtime Chat App

A modern, real-time chat application built with Next.js, Supabase, and WebSockets featuring user authentication, real-time messaging, and typing indicators.

## Features

- 🔐 **User Authentication** - Register/Login with Supabase Auth
- 💬 **Real-time Messaging** - Instant message delivery using Supabase Realtime
- 👤 **User Profiles** - Custom usernames and profile management
- 🎯 **Typing Indicators** - See when others are typing (coming soon)
- 📱 **Responsive Design** - Works on desktop and mobile
- 🚀 **Deployed on Vercel** - Production-ready deployment

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Realtime)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel
- **Icons**: Lucide React

## Quick Start

### 1. Supabase Setup

1. Go to [Supabase Dashboard](https://khrdioffvpjsqytcxler.supabase.co)
2. Navigate to **Authentication** > **Settings** and enable Email authentication
3. In **SQL Editor**, run this setup script:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Messages are viewable by everyone" ON messages FOR SELECT USING (true);
CREATE POLICY "Users can insert messages" ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

4. In **Database** > **Replication**, enable realtime for both `messages` and `profiles` tables.

### 2. Local Development

```bash
# Clone or create the project
mkdir realtime-chat-app
cd realtime-chat-app

# Install dependencies
npm install

# Create environment file
cp .env.local.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

### 3. Deploy to Vercel

#### Option A: Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow the prompts and add environment variables when asked
```

#### Option B: GitHub + Vercel Dashboard
1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com)
3. Click "Import Project" and select your GitHub repo
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

## Project Structure

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
└── components/
    └── ChatApp.tsx
```

## How It Works

1. **Authentication**: Users can register/login using email and password through Supabase Auth
2. **Real-time Updates**: Messages are synchronized in real-time using Supabase's PostgreSQL Change Data Capture
3. **User Profiles**: Automatic profile creation on signup with customizable usernames
4. **Message History**: All messages are persisted in PostgreSQL with user associations

## Testing Real-time Functionality

1. Deploy your app or run it locally
2. Open the app in two different browsers/tabs
3. Register/login with different accounts
4. Start chatting - messages should appear instantly in both windows!

## Environment Variables

Create a `.env.local` file with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://khrdioffvpjsqytcxler.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

## Features Coming Soon

- [ ] Typing indicators with real-time updates
- [ ] Online user presence
- [ ] Multiple chat rooms
- [ ] File/image sharing
- [ ] Message reactions
- [ ] User avatars
- [ ] Message search
- [ ] Push notifications

## Troubleshooting

### Common Issues

1. **"Invalid API key"**: Double-check your Supabase credentials in `.env.local`
2. **Database errors**: Ensure you've run the SQL setup script in Supabase
3. **Realtime not working**: Check that realtime is enabled for your tables in Supabase

### Vercel Deployment Issues

1. Make sure environment variables are set in Vercel dashboard
2. Check build logs for any missing dependencies
3. Ensure your Supabase project allows connections from Vercel's domains

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for learning or commercial purposes!