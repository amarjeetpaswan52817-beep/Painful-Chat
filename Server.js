const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// आपका एडमिन पासवर्ड
const ADMIN_PASSWORD = "Amar@123";

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// पोस्ट्स की सूची
let posts = [
  {
    id: 1,
    headerText: "Day 1",
    content: "मैं अमरजीत मैं आजकल यहीं Backchodi करते हैं।",
    likes: 0,
    comments: [
      { text: "कुछ बातें लफ़्ज़ों से बयाँ नहीं होतीं, बस दिल के किसी कोने में खामोश रहती हैं" }
    ]
  }
];

// नया विचार जोड़ने के लिए एडमिन API
app.post('/api/new-thought', (req, res) => {
  const { password, headerText, content } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "गलत पासवर्ड!" });
  }

  if (!content || !content.trim()) {
    return res.status(400).json({ success: false, message: "विचार खाली नहीं हो सकता!" });
  }

  const newPost = {
    id: Date.now(),
    headerText: headerText.trim() || `Day ${posts.length + 1}`,
    content: content.trim(),
    likes: 0,
    comments: []
  };

  posts.push(newPost);
  io.emit('new-post-added', newPost);
  res.json({ success: true, message: "विचार सफलतापूर्वक नीचे जुड़ गया!" });
});

// विचार संपादित (Edit) करने के लिए API
app.post('/api/edit-thought', (req, res) => {
  const { password, postId, content } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "गलत पासवर्ड!" });
  }

  const post = posts.find(p => p.id === Number(postId));
  if (!post) {
    return res.status(404).json({ success: false, message: "पोस्ट नहीं मिली!" });
  }

  post.content = String(content || '').trim();
  io.emit('post-updated', { postId: post.id, content: post.content });
  res.json({ success: true, message: "विचार सफलतापूर्वक अपडेट हो गया!" });
});

// विचार हटाने (Delete) के लिए API
app.post('/api/delete-thought', (req, res) => {
  const { password, postId } = req.body;

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "गलत पासवर्ड!" });
  }

  posts = posts.filter(p => p.id !== Number(postId));
  io.emit('post-deleted', Number(postId));
  res.json({ success: true, message: "विचार सफलतापूर्वक हटा दिया गया!" });
});

io.on('connection', (socket) => {
  socket.emit('load-posts', posts);

  socket.on('like-post', (postId) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      post.likes += 1;
      io.emit('update-likes', { postId: post.id, likes: post.likes });
    }
  });

  socket.on('new-comment', ({ postId, text }) => {
    const cleanText = String(text || '').trim().slice(0, 200);
    if (!cleanText) return;

    const post = posts.find(p => p.id === postId);
    if (post) {
      const commentObj = { text: cleanText };
      post.comments.push(commentObj);
      io.emit('comment-added', { postId: post.id, comment: commentObj });
    }
  });
});

server.listen(PORT, () => {
  console.log(`CHAPTER 15 सर्वर पोर्ट ${PORT} पर चालू है`);
});
