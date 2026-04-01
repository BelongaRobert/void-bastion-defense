# DaShade v2.0 - Blood Raven Librarian

**Knowledge That Never Goes Offline**

## 🚀 Quick Start (3 Batch Files Only)

| File | When to Use |
|------|-------------|
| **SETUP.bat** | **FIRST TIME ONLY** - Install Ollama + download AI model (needs internet) |
| **START.bat** | **EVERY DAY** - Launch DaShade chat (fully offline) |
| **CENTER.bat** | **OPTIONAL** - Open web management interface |

---

## First Time Setup (One Time Only!)

1. **Run SETUP.bat**
   - Installs Ollama (if needed)
   - Downloads AI model (4.7 GB, needs internet)
   - Takes 10-30 minutes

2. **Done!** Your system is now ready for OFFLINE usage.

---

## Daily Usage (Fully Offline!)

Just double-click: **START.bat**

That's it! Chat with your AI librarian.

---

## Features

### 💬 Chat Commands
- `/upload <file>` - Index a document
- `/search <query>` - Search knowledge base
- `/help` - Show all commands

### 📚 Knowledge Base
- Drop .txt or .md files in `knowledge/` folder
- Documents auto-index on startup
- AI answers using YOUR documents

### 🌐 Command Center (Optional)
- Run: `CENTER.bat`
- Open: http://localhost:3473
- Web interface for managing documents

---

## File Structure

```
E:\DaShade\
├── START.bat          ← Run this to chat!
├── SETUP.bat          ← Run once to setup
├── CENTER.bat         ← Optional web UI
├── README.txt         ← This file
├── launcher\          ← Core programs
│   ├── tui-chat.mjs   ← Chat engine
│   └── command-center.mjs ← Web server
├── knowledge\         ← Your documents
│   └── [add .txt/.md files here]
├── workspace\         ← Chat history
├── legacy\            ← Old files (ignore)
└── models\            ← AI brain (auto)
```

---

## Troubleshooting

**"Ollama not found"**
→ Run SETUP.bat first

**"Model not found"**
→ Run SETUP.bat (needs internet once)

**"Port already in use"**
→ Another program is using port 3473

---

## Tips

- Add documents to `knowledge/` folder for smarter AI
- Use `/search` to find info in your documents
- Everything stays on USB - no cloud!
- Works on ANY Windows PC after setup

---

⚔️ **The Emperor protects!**

🐙 **Knowledge is power, guard it well.**

---

Version 2.0 | Blood Raven Chapter | For the Emperor!
