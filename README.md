# 👋 SafeStrangers - Real-Time Video Meetings

> **Connect with interesting people in real-time. Safely, anonymously, and without judgment.**

---
## 🎯 What's This All About?

Ever wanted to meet new people and have meaningful conversations without the awkwardness? **SafeStrangers** is here to fix that! 

It's a real-time video and chat platform where you can:
- 🎥 Connect with random people via video chat
- 💬 Switch to text-based conversations whenever you want
- 🎭 Stay completely anonymous—no profiles, no pressure
- 🛡️ Browse with confidence thanks to built-in safety features
- ✨ Share interests and find like-minded people

Think of it as your new favorite way to meet people online. No awkward profiles. No games. Just real conversations.

---

## ✨ Cool Features

### 🔐 **Safety First**
- NSFW content detection to keep the platform clean
- Safety tips and guidelines before you start
- Report system for suspicious behavior
- Completely anonymous matching

### 🎮 **Flexible Chatting**
- **Video Mode**: Face-to-face real-time conversations
- **Chat Mode**: Text-only if you prefer (or your internet is acting up 😅)
- **Floating Reactions**: Send quick reactions without typing

### 👥 **Smart Matching**
- Add interests to find people who *actually* share your passions
- Get matched with people who speak your language of interests
- No endless scrolling—just meaningful connections

### 🎙️ **Accessibility Features**
- Speech-to-text integration
- Mobile-friendly design
- Works great in low-bandwidth situations

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- A decent internet connection (for video)

### Installation

1. **Clone the repo** (or extract the files)
```bash
cd realtime-meet
```

2. **Install dependencies**
```bash
npm install
cd server && npm install && cd ..
```

3. **Fire it up!** 🔥
```bash
npm run dev-all
```

This starts both the Next.js frontend and the Express backend. Magic happens at:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000

### Just want to run one part?
```bash
npm run dev          # Frontend only
npm run server       # Backend only
```

---

## 📁 Project Structure

```
realtime-meet/
├── app/                          # Next.js frontend (React)
│   ├── components/              # Reusable UI components
│   │   ├── MatchingQueue.js     # Finding your match
│   │   ├── SafetyModal.js       # Safety guidelines
│   │   └── FloatingReactions.js # Quick reactions
│   ├── hooks/                   # Custom React hooks
│   │   ├── useWebRTC.js         # Video streaming magic
│   │   ├── useAnonymousChat.js  # Chat logic
│   │   └── useNSFWDetection.js  # Content safety
│   ├── chat/                    # Chat-specific pages
│   ├── page.js                  # Landing page
│   └── globals.css              # Styling
│
├── server/                       # Express backend
│   ├── managers/                # Business logic
│   │   ├── matchManager.js      # Matching algorithm
│   │   └── poolManager.js       # User pool management
│   ├── utils/                   # Helper functions
│   ├── config/                  # Configuration
│   └── index.js                 # Server entry point
│
└── public/                       # Static assets
```

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** - React framework for the web
- **React 18** - UI library
- **Tailwind CSS** - Beautiful styling without the hassle
- **Socket.io** - Real-time communication
- **WebRTC** - Peer-to-peer video magic
- **TensorFlow.js + NSFWJS** - Smart content detection

### Backend
- **Express.js** - Node.js web framework
- **Socket.io** - WebSocket handling
- **CORS** - Cross-origin request handling

---

## 🎯 How It Works

### The Matching Process
1. You add interests (Gaming, Music, Movies, etc.)
2. You click "Find Match"
3. Our algorithm finds someone with overlapping interests
4. Boom! You're connected in a video chat
5. Not feeling it? Skip and find someone new

### Under the Hood
- **WebRTC** handles the video streaming directly between browsers (peer-to-peer)
- **Socket.io** manages the matching, signaling, and messages
- **NSFW Detection** scans video frames to keep things appropriate
- **Encryption** keeps your data private

---

## 🔒 Safety & Privacy

Your privacy matters to us:
- ✅ **Completely Anonymous** - No usernames, no profiles, no tracking
- ✅ **No Data Storage** - We don't save your conversations
- ✅ **NSFW Detection** - AI-powered content filtering
- ✅ **User Reports** - Flag inappropriate behavior instantly
- ✅ **Quick Escape** - End any chat with one click

---

## 📦 Available Scripts

In the frontend directory:

```bash
npm run dev          # Start development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # Check code quality
```

In the backend directory:

```bash
npm start            # Run the server
npm run dev          # Run with hot reload (nodemon)
```

Or from the root:

```bash
npm run dev-all      # Run frontend + backend together 🎉
```

---

## 🤝 Contributing

Have an idea? Found a bug? We'd love your help!

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ⚖️ License

This project is open source and available under the MIT License - feel free to use it, modify it, and build upon it.

---

## 🤔 FAQ

**Q: Is this really anonymous?**
A: Yep! We don't collect usernames, emails, or personal info. You're just a random person looking to chat.

**Q: What if someone's being inappropriate?**
A: Our NSFW detection catches most stuff, and you can report users instantly. We take safety seriously.

**Q: Can I use this on mobile?**
A: Absolutely! It's fully responsive. Though video works best on a stable connection.

**Q: Why did I get matched with someone with different interests?**
A: Our algorithm tries its best, but sometimes we're looking at the same time—even with different interests! Still cool conversations happen.

---

## 🙌 Having Fun Yet?

If you like what you see, give us a ⭐ on GitHub! It helps more people discover SafeStrangers.

---

**Ready to meet someone cool? Start with:**
```bash
npm install && npm run dev-all
```

Then head to http://localhost:3000 and say hello! 👋

---

*Built with ❤️ for meaningful human connection.*
