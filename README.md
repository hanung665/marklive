# Markdown → HTML — Live Preview

A lightweight, browser-based **Markdown-to-HTML editor** with **live preview**, syntax highlighting, and export functionality.  
Built with **HTML, CSS, and Vanilla JavaScript** (no frameworks).  

### Live Deme: [https://iabhi-me.github.io/marklive](https://iabhi-me.github.io/marklive)

## ✨ Features

- 📝 **Live Preview** — Type Markdown on the left, see HTML on the right instantly.  
- 🎨 **Light/Dark Theme** — Persistent theme preference (auto-detects system theme).  
- 📋 **Editor Controls** — Buttons for headings, bold, italic, lists, code, etc.  
- 💾 **Auto-Save** — Content is saved to localStorage automatically.  
- 🔄 **Undo/Redo** — Built-in undo/redo stack (Ctrl/Cmd+Z, Ctrl/Cmd+Y).  
- 📑 **Markdown Extensions**:
  - Headings, bold, italic
  - Links & images (including drag & drop for images, saved as Base64)
  - Blockquotes & horizontal rules
  - Inline code & fenced code blocks (with Prism.js syntax highlighting)
  - Ordered/unordered lists
  - Task lists (`- [ ]` / `- [x]`)
  - Tables (GitHub-style parsing)
  - Superscripts & footnotes
  - Emoji shortcodes (`:smile:`, `:rocket:`, etc.)
- ⚡ **Export Options**:
  - Copy rendered HTML to clipboard
  - Export as standalone `.html` file
- 🔍 **Preview-Only Mode** — Hide editor for distraction-free preview.

## 🚀 Getting Started

### 1. Clone or Download
```bash
git clone https://github.com/yourusername/markdown-live-preview.git
cd markdown-live-preview
```

### 2. Open in Browser
Just open `index.html` in your browser — no build tools required.  

### 3. Start Writing
Type Markdown into the editor panel, and see the preview update live.

## 🖼️ Screenshots

*(You can add screenshots here showing light mode, dark mode, and live preview in action.)*

## 🛠️ Tech Stack

- **HTML5** — Structure
- **CSS3 (Custom Properties, Responsive Design)** — Styling & dark/light themes
- **Vanilla JavaScript** — Markdown parsing, autosave, undo/redo, image handling
- **[Prism.js](https://prismjs.com/)** — Code syntax highlighting

## 📂 Project Structure

```
.
├── index.html    # Main HTML page
├── style.css     # Styles (light/dark mode, preview, tables, etc.)
└── script.js     # Markdown parser, editor logic, autosave, themes
```

## 🎯 Roadmap / Possible Improvements

- [ ] Support for custom CSS themes
- [ ] Export to Markdown + PDF
- [ ] Collaborative editing via WebSockets
- [ ] Plugin system for extra Markdown features

## 📜 License

MIT License © 2025 Abhinav
