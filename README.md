# IPTV Web Player 🎥📺

A lightweight web-based IPTV player built with **HTML, CSS, and JavaScript**, using [hls.js](https://github.com/video-dev/hls.js) to play `.m3u8` streams in browsers that don’t support HLS natively.

---

## ✨ Features
- Load IPTV playlists in **M3U format**  
- Built-in support for [iptv-org playlists](https://github.com/iptv-org/iptv)  
- Channel list with **search/filter**  
- Channel info: name, logo, group/country  
- Player controls:
  - ▶️ Play / ⏸ Pause  
  - ⏮ Previous / ⏭ Next channel  
  - 🔊 Volume / Mute  
- Auto-skip if a stream fails  
- Keyboard shortcuts:
  - `Space` → Play/Pause  
  - `↑` → Previous channel  
  - `↓` → Next channel  
  - `M` → Toggle mute  

---

## 📦 Installation & Usage

1. **Clone this repo**:
   ```bash
   git clone https://github.com/your-username/iptv-web-player.git
   cd iptv-web-player
Open index.html in your browser.
(No build tools required — pure HTML + JS.)

By default, the player loads Sinhala language channels from iptv-org:

https://iptv-org.github.io/iptv/languages/sin.m3u
To load another playlist, click “Load IPTV Playlist” and paste any .m3u URL.

⚠️ Disclaimer

This project is for educational and personal use only.

The player does not host or distribute any streams.

All channel streams come from publicly available sources (e.g. iptv-org
).

🛠️ Tech Stack

Vanilla JavaScript (ES6)

HTML5 Video + hls.js

Minimal CSS (custom styles, no frameworks)
