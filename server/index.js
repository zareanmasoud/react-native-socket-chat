const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const mongojs = require('mongojs');

const db = mongojs(process.env.MONGO_URL || 'mongodb://localhost:27017/local');
const app = express();
const server = http.Server(app);
const websocket = socketio(server);
server.listen(3000, () => console.log('listening on *:3000'));

let clients = {};
let users = {};
const chatId = 1;

websocket.on('connection', (socket) => {
    clients[socket.id] = socket;
    socket.on('userJoined', (userId) => onUserJoined(userId, socket));
    socket.on('message', (message) => onMessageReceived(message, socket));
});

// Event Listeners.
function onUserJoined(userId, socket) {
  try {
    if (!userId) {
      db.collection('users').insert({}, (err, user) => {
        socket.emit('userJoined', user._id);
        users[socket.id] = user._id;
        _sendExistingMessages(socket);
      });
    } else {
      users[socket.id] = userId;
      _sendExistingMessages(socket);
    }
  } catch(err) {
    console.err(err);
  }
}

function onMessageReceived(message, senderSocket) {
  const userId = users[senderSocket.id];
  if (!userId) return;

  _sendAndSaveMessage(message, senderSocket);
}

// Helper functions.
function _sendExistingMessages(socket) {
  db.collection('messages')
    .find({ chatId })
    .sort({ createdAt: 1 })
    .toArray((err, messages) => {
      if (!messages.length) return;
      socket.emit('message', messages.reverse());
  });
}

function _sendAndSaveMessage(message, socket, fromServer) {
  const messageData = {
    text: message.text,
    user: message.user,
    createdAt: new Date(message.createdAt),
    chatId: chatId
  };

  db.collection('messages').insert(messageData, (err, message) => {
    const emitter = fromServer ? websocket : socket.broadcast;
    emitter.emit('message', [message]);
  });
}

const stdin = process.openStdin();
stdin.addListener('data', function(d) {
  _sendAndSaveMessage({
    text: d.toString().trim(),
    createdAt: new Date(),
    user: { _id: 'robot' }
  }, null /* no socket */, true /* send from server */);
});

