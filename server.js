const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

const supabaseUrl =
  process.env.SUPABASE_URL || "https://khrdioffvpjsqytcxler.supabase.co";
const supabaseAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtocmRpb2ZmdnBqc3F5dGN4bGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2NjkyMzEsImV4cCI6MjA3MTI0NTIzMX0.QXXcrRZBeguR_HRXy8kObbEUHh8wwxnnHYTSFNm2FdA";

// global client (anon) for public reads
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const corsOptions = {
  origin: ["http://localhost:3002", "http://127.0.0.1:3002"],
  methods: ["GET", "POST"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const io = socketIo(server, {
  cors: corsOptions,
  transports: ["websocket", "polling"],
});

const activeUsers = new Map();

async function authenticateUser(token) {
  try {
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error } = await userClient.auth.getUser();
    if (error || !user) return { error: "Invalid token" };

    let username = user.email?.split("@")[0] || "Anonymous";

    try {
      const { data: profile } = await userClient
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      if (profile) username = profile.username;
    } catch (e) {
      console.log("Profile not found, using email");
    }

    return {
      user,
      username,
      client: userClient, // return client scoped with this token
    };
  } catch (err) {
    return { error: err.message };
  }
}

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);

  socket.authenticated = false;
  socket.userId = null;
  socket.username = null;
  socket.supabaseClient = null;

  socket.on("authenticate", async (data) => {
    const { token } = data;
    const authResult = await authenticateUser(token);

    if (authResult.error) {
      socket.emit("auth_error", { error: authResult.error });
      return;
    }

    socket.authenticated = true;
    socket.userId = authResult.user.id;
    socket.username = authResult.username;
    socket.supabaseClient = authResult.client; // per-user client

    activeUsers.set(socket.userId, {
      id: socket.userId,
      username: socket.username,
      email: authResult.user.email,
      socketId: socket.id,
    });

    socket.join("general");
    socket.emit("authenticated", {
      user: {
        id: socket.userId,
        email: authResult.user.email,
        username: socket.username,
      },
    });
    socket.emit("active_users", Array.from(activeUsers.values()));
    socket.broadcast.emit("user_connected", {
      user: activeUsers.get(socket.userId),
      activeUsers: Array.from(activeUsers.values()),
    });
  });

  socket.on("join_room", async (roomId) => {
    if (!socket.authenticated) return;

    socket.join(roomId);

    try {
      const { data: messages } = await socket.supabaseClient
        .from("messages")
        .select(
          `
          id,
          content,
          user_id,
          room_id,
          created_at,
          profiles (username)
        `
        )
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .limit(50);

      const formattedMessages = (messages || []).map((msg) => ({
        id: msg.id,
        content: msg.content,
        user_id: msg.user_id,
        room_id: msg.room_id,
        created_at: msg.created_at,
        user: {
          id: msg.user_id,
          username: msg.profiles?.username || "Anonymous",
        },
      }));

      socket.emit("message_history", formattedMessages);
    } catch (error) {
      console.error("Error loading messages:", error);
      socket.emit("message_history", []);
    }
  });

  socket.on("send_message", async (data) => {
    if (!socket.authenticated) return;

    try {
      const { content, roomId = "general" } = data;

      const { data: messageData, error } = await socket.supabaseClient
        .from("messages")
        .insert({
          content: content.trim(),
          user_id: socket.userId,
          room_id: roomId,
        })
        .select()
        .single();

      if (error) {
        console.error("Message error:", error);
        socket.emit("message_error", { error: error.message });
        return;
      }

      const formattedMessage = {
        id: messageData.id,
        content: messageData.content,
        user_id: messageData.user_id,
        room_id: messageData.room_id,
        created_at: messageData.created_at,
        user: {
          id: socket.userId,
          username: socket.username,
        },
      };

      io.to(roomId).emit("new_message", formattedMessage);
    } catch (error) {
      console.error("Send message error:", error);
      socket.emit("message_error", { error: "Failed to send message" });
    }
  });

  socket.on("typing_start", (data) => {
    if (!socket.authenticated) return;
    socket.to(data.roomId || "general").emit("user_typing", {
      userId: socket.userId,
      username: socket.username,
      typing: true,
    });
  });

  socket.on("typing_stop", (data) => {
    if (!socket.authenticated) return;
    socket.to(data.roomId || "general").emit("user_typing", {
      userId: socket.userId,
      username: socket.username,
      typing: false,
    });
  });

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id);

    if (socket.authenticated && socket.userId) {
      activeUsers.delete(socket.userId);
      socket.broadcast.emit("user_disconnected", {
        userId: socket.userId,
        activeUsers: Array.from(activeUsers.values()),
      });
    }
  });
});

app.get("/", (req, res) => {
  res.json({ message: "Chat server running", activeUsers: activeUsers.size });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
