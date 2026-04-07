# Void Bastion Defense - Electron Wrapper

A desktop application wrapper for Void Bastion Defense, built with Electron for Steam distribution.

## ⚔️ Features

- **Window Management**: Configurable 1280x720 default, scalable down to 800x600
- **Fullscreen Toggle**: F11 support
- **Menu System**: Full File, View, and Help menus
- **Steam Integration**: Ready for Steamworks SDK (achievements, cloud saves)
- **Auto-Updater**: GitHub releases integration
- **Production Ready**: Minified builds, single instance lock, crash reporter

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Windows (for building .exe)

### Installation

```bash
cd void-bastion-electron
npm install
```

### Development

```bash
# Run in development mode
npm run dev

# Or with dev tools
npm start
```

### Building

```bash
# Build installer and portable
npm run build

# Build Windows only
npm run build:win

# Build portable only
npm run build:portable
```

## 📁 Project Structure

```
void-bastion-electron/
├── main.js              # Main process (window, menu, IPC)
├── preload.js           # Secure IPC bridge
├── package.json         # Dependencies and build config
├── src/
│   └── index.html       # Game entry point
├── assets/
│   └── icon.ico         # Application icon
├── build/
│   └── installer.nsh    # NSIS installer customizations
├── steam/
│   └── greenworks-wrapper.js  # Steamworks integration
└── dist/                # Build output
```

## 🎮 Steam Integration

### Setting Up Steamworks

1. Download Steamworks SDK from [Steam Partner site](https://partner.steamgames.com/)
2. Extract to `steamworks_sdk/` directory
3. Uncomment Steam-related code in `main.js`
4. Install greenworks: `npm install greenworks`

### Achievements

```javascript
// In your game code
if (window.electronAPI) {
  window.electronAPI.unlockAchievement('ACH_FIRST_WIN');
}
```

### Cloud Saves

Cloud saves are automatically handled through the Steam API when available, with local fallback.

## 🏗️ Build Configuration

### Windows Targets

- **NSIS Installer**: `Void Bastion Defense Setup.exe`
- **Portable**: `Void Bastion Defense Portable.exe`

### Code Signing

Add to `build.win` in package.json:

```json
"certificateFile": "path/to/cert.p12",
"certificatePassword": "password"
```

## 📝 Menu Shortcuts

| Action | Shortcut |
|--------|----------|
| New Game | Ctrl+N |
| Load Game | Ctrl+L |
| Save Game | Ctrl+S |
| Quit | Ctrl+Q |
| Fullscreen | F11 |
| Dev Tools | F12 (dev only) |

## 🔧 Configuration

Edit `main.js` to customize:
- Window dimensions and constraints
- Menu items
- IPC handlers
- Steam integration settings

## 📦 Distribution

### Steam

1. Build the application
2. Upload `dist/` contents to Steamworks
3. Configure launch options in Steamworks

### Standalone

Distribute the NSIS installer or portable executable from `dist/`.

## 🐛 Troubleshooting

### Game Not Loading

- Ensure game files are in `src/` directory
- Check console for errors

### Steam Not Connecting

- Verify Steam is running
- Check Steamworks SDK is properly installed
- Review logs in `%APPDATA%/Void Bastion Defense/logs`

## 📄 License

Proprietary - Void Bastion Studios

---

**The Emperor protects!** ⚔️🐙
