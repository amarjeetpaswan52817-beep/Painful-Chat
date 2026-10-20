const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// पोस्ट डेटा (मेमोरी में)
let postData = {
  likes: 0,
  comments: [
    { text: "☠️ WELCOME TO THE HARAMI ZONE ☠️" }
  ]
};

io.on('connection', (socket) => {
  // जब कोई नया यूज़र जुड़े, उसे मौजूदा लाइक्स और कमेंट्स भेजना
  socket.emit('init-data', postData);

  // जब कोई लाइक बटन दबाए
  socket.on('like-click', () => {
    postData.likes += 1;
    io.emit('update-likes', postData.likes);
  });

  // जब कोई नया कमेंट भेजे
  socket.on('new-comment', (text) => {
    const cleanText = String(text || '').trim().slice(0, 200);
    if (!cleanText) return;

    postData.comments.push({ text: cleanText });
    io.emit('comment-added', cleanText);
  });
});

server.listen(PORT, () => {
  console.log(`PAINFUL सर्वर पोर्ट ${PORT} पर चालू है`);
});
