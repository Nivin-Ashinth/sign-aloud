// Firebase Configuration
var config = {
  apiKey: "AIzaSyD63EH5AF5Qfq61fPEqa-D03B1XPXeHCRM",
  authDomain: "chat-demo-5bcdb.firebaseapp.com",
  databaseURL: "https://chat-demo-5bcdb-default-rtdb.firebaseio.com/",
  projectId: "chat-demo-5bcdb",
  storageBucket: "chat-demo-5bcdb.firebasestorage.app",
  messagingSenderId: "1052747513263"
};
firebase.initializeApp(config);

var database = firebase.database().ref();
var yourVideo = document.getElementById("yourVideo");
var friendsVideo = document.getElementById("friendsVideo");
var ivrButtons = document.getElementById("ivrButtons");
var yourId = Math.floor(Math.random() * 1000000000);
var servers = {
  iceServers: [
    { urls: "stun:stun.services.mozilla.com" },
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "turn:numb.viagenie.ca", credential: "beaver", username: "webrtc.websitebeaver@gmail.com" }
  ]
};
var pc = new RTCPeerConnection(servers);
pc.onicecandidate = (event) =>
  event.candidate ? sendMessage(yourId, JSON.stringify({ ice: event.candidate })) : console.log("Sent All Ice");
pc.onaddstream = (event) => (friendsVideo.srcObject = event.stream);

function sendMessage(senderId, data) {
  var msg = database.push({ sender: senderId, message: data });
  msg.remove();
}

function showMyFace() {
  navigator.mediaDevices
    .getUserMedia({ audio: true, video: true })
    .then((stream) => (yourVideo.srcObject = stream))
    .then((stream) => pc.addStream(stream));
}

function showFriendsFace() {
  pc.createOffer()
    .then((offer) => pc.setLocalDescription(offer))
    .then(() => sendMessage(yourId, JSON.stringify({ sdp: pc.localDescription })));
  ivrButtons.style.display = "block"; // Show IVR buttons after starting the call
}

function readMessage(data) {
  var msg = JSON.parse(data.val().message);
  var sender = data.val().sender;

  if (sender !== yourId) {
    if (msg.ice !== undefined) {
      pc.addIceCandidate(new RTCIceCandidate(msg.ice));
    } else if (msg.sdp?.type === "offer") {
      pc.setRemoteDescription(new RTCSessionDescription(msg.sdp))
        .then(() => pc.createAnswer())
        .then((answer) => pc.setLocalDescription(answer))
        .then(() => sendMessage(yourId, JSON.stringify({ sdp: pc.localDescription })));
      ivrButtons.style.display = "block"; // Show IVR buttons for the receiver
    } else if (msg.sdp?.type === "answer") {
      pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
    } else if (msg.ivr) {
      playSpeech(msg.ivr); // Play the IVR message as speech
    }
  }
}

database.on("child_added", readMessage);

function sendIVRMessage(message) {
  sendMessage(yourId, JSON.stringify({ ivr: message })); // Send IVR message to Firebase
  displayIVRMessage(message); // Immediately display it locally
}

function displayIVRMessage(message) {
  alert("IVR Message Sent: " + message); // Display the message locally
}

function playSpeech(message) {
  // Use SpeechSynthesis API to convert text to speech
  const synth = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(message);
  synth.speak(utterance);
}

function endCall() {
  let tracks = yourVideo.srcObject ? yourVideo.srcObject.getTracks() : [];
  tracks.forEach((track) => track.stop());
  if (pc) {
    pc.close();
    pc = null;
  }
  yourVideo.srcObject = null;
  friendsVideo.srcObject = null;
  ivrButtons.style.display = "none"; // Hide IVR buttons after ending the call
  console.log("Call ended");
}

