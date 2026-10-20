const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Amar@123";
const MONGO_URI = process.env.MONGO_URI;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// MongoDB Schema
const postSchema = new mongoose.Schema({
  headerText: { type: String, default: "Day 1" },
  content: { type: String, required: true },
  likes: { type: Number, default: 0 },
  comments: [{ text: String }],
  createdAt: { type: Date, default: Date.now }
});

const Post = mongoose.model('Post', postSchema);

// Database Connection
if (MONGO_URI) {
  mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB Atlas connected successfully!"))
    .catch(err => console.error("MongoDB Connection Error:", err));
} else {
  console.log("Warning: MONGO_URI not set!");
}

// Naya thought add karne ki API
app.post('/api/new-thought', async (req, res) => {
  const { password, headerText, content } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Galat Password!" });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: "Thought khali nahi ho sakta!" });
  }

  try {
    const count = await Post.countDocuments();
    const newPost = new Post({
      headerText: headerText.trim() || `Day ${count + 1}`,
      content: content.trim(),
      likes: 0,
      comments: []
    });

    await newPost.save();
    io.emit('new-post-added', newPost);
    res.json({ success: true, message: "Thought database me save ho gaya!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error!" });
  }
});

// Edit API
app.post('/api/edit-thought', async (req, res) => {
  const { password, postId, content } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Galat Password!" });
  }

  try {
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ success: false, message: "Post nahi mili!" });

    post.content = String(content || '').trim();
    await post.save();

    io.emit('post-updated', { postId: post._id, content: post.content });
    res.json({ success: true, message: "Thought update ho gaya!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Update nahi ho paya!" });
  }
});

// Delete API
app.post('/api/delete-thought', async (req, res) => {
  const { password, postId } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Galat Password!" });
  }

  try {
    await Post.findByIdAndDelete(postId);
    io.emit('post-deleted', postId);
    res.json({ success: true, message: "Thought delete ho gaya!" });
  } catch (err) {
    res.status(500).json({ success: false, message: "Delete nahi ho saka!" });
  }
});

io.on('connection', async (socket) => {
  try {
    // Database se sabhi posts load karna
    const posts = await Post.find().sort({ createdAt: 1 });
    socket.emit('load-posts', posts);
  } catch (err) {
    console.error(err);
  }

  // Like Toggle
  socket.on('toggle-like', async ({ postId, action }) => {
    try {
      const update = action === 'like' ? 1 : -1;
      const post = await Post.findByIdAndUpdate(
        postId,
        { $inc: { likes: update } },
        { new: true }
      );
      if (post && post.likes < 0) {
        post.likes = 0;
        await post.save();
      }
      if (post) {
        io.emit('update-likes', { postId: post._id, likes: post.likes });
      }
    } catch (err) {
      console.error(err);
    }
  });

  // Comment
  socket.on('new-comment', async ({ postId, text }) => {
    const cleanText = String(text || '').trim().slice(0, 200);
    if (!cleanText) return;

    try {
      const post = await Post.findById(postId);
      if (post) {
        const commentObj = { text: cleanText };
        post.comments.push(commentObj);
        await post.save();
        io.emit('comment-added', { postId: post._id, comment: commentObj });
      }
    } catch (err) {
      console.error(err);
    }
  });
});

server.listen(PORT, () => {
  console.log(`CHAPTER 15 server port ${PORT} par chal raha hai`);
});
