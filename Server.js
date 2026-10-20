const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// आपका एडमिन पासवर्ड
const ADMIN_PASSWORD = "painful@amarjeet";

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// पोस्ट्स की सूची (नया थॉट नीचे जुड़ेगा)
let posts = [
  {
    id: 1,
    headerText: "Day 1",
    content: "मैं अमरजीत मैं आजकल यहीं Backchodi करता हूँ।",
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

  // नया विचार नीचे (अंत में) जुड़ेगा
  posts.push(newPost);

  // सभी यूज़र्स को तुरंत नया विचार भेजना
  io.emit('new-post-added', newPost);

  res.json({ success: true, message: "विचार सफलतापूर्वक नीचे जुड़ गया!" });
});

io.on('connection', (socket) => {
  // वेबसाइट खोलते ही सारे पोस्ट्स भेजना
  socket.emit('load-posts', posts);

  // लाइक आने पर
  socket.on('like-post', (postId) => {
    const post = posts.find(p => p.id === postId);
    if (post) {
      post.likes += 1;
      io.emit('update-likes', { postId: post.id, likes: post.likes });
    }
  });

  // नया कमेंट आने पर
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
