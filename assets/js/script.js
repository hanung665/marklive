// script.js — fixed table parsing + persistent theme + autosave + task lists + footnotes/superscript + emoji

const mdEl = document.getElementById('md');
const previewEl = document.getElementById('preview');
const statusEl = document.getElementById('status');
const themeToggle = document.getElementById('theme-toggle');
const root = document.documentElement;

function escapeHTML(str){
  return str.replace(/[&<>\"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'})[s]);
}

// Emoji mapping
const emojiMap = {
  ':smile:': '😄', ':laughing:': '😆', ':wink:': '😉', ':heart:': '❤️', ':thumbsup:': '👍', ':star:': '⭐',
  ':fire:': '🔥', ':cry:': '😢', ':clap:': '👏', ':rocket:': '🚀'
};

function replaceEmoji(text){
  return text.replace(/:[a-z0-9_+\-]+:/gi, m => emojiMap[m] || m);
}

// Parse tables by scanning lines — robust and avoids partial matches
function parseTables(text){
  const lines = text.split('\n');
  const out = [];
  for(let i=0;i<lines.length;i++){
    const line = lines[i];
    // only consider lines that look like a table header (start and end with '|')
    if(line.trim().startsWith('|') && line.includes('|')){
      const next = lines[i+1] || '';
      // divider line: e.g. | --- | ---: | :---: |
      if(/^\|\s*[:\-]+\s*(\|\s*[:\-]+\s*)*\|?\s*$/.test(next)){
        // collect header cells
        const headerCells = line.split('|').slice(1, -1).map(h => h.trim());
        // collect row lines following divider
        let j = i + 2;
        const rows = [];
        while(j < lines.length && lines[j].trim().startsWith('|')){
          rows.push(lines[j].split('|').slice(1, -1).map(c => c.trim()));
          j++;
        }
        // build table HTML (cells are already escaped upstream)
        const headersHtml = headerCells.map(h => `<th>${h}</th>`).join('');
        const rowsHtml = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('');
        out.push(`<table><thead><tr>${headersHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`);
        i = j - 1; // advance index to last consumed row
        continue;
      }
    }
    out.push(line);
  }
  return out.join('\n');
}

// Drag & Drop Images
mdEl.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "copy";
});

mdEl.addEventListener("drop", (e) => {
  e.preventDefault();

  const files = e.dataTransfer.files;
  if (!files || files.length === 0) return;

  [...files].forEach((file) => {
    if (!file.type.startsWith("image/")) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result; // data:image/...;base64,...
      const syntax = `![](${base64})`;

      // Focus the editor and insert text via execCommand → undo/redo works
      mdEl.focus();
      document.execCommand("insertText", false, syntax);

      debouncedUpdate();
      statusEl.textContent = `Inserted image: ${file.name}`;
    };

    reader.readAsDataURL(file);
  });
});

const undoStack = [];
const redoStack = [];
const MAX_STACK = 50;

function saveState() {
  undoStack.push(mdEl.value);
  if (undoStack.length > MAX_STACK) undoStack.shift();
  redoStack.length = 0; // clear redo on new action
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(mdEl.value);
  const prev = undoStack.pop();
  mdEl.value = prev;
  debouncedUpdate();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(mdEl.value);
  const next = redoStack.pop();
  mdEl.value = next;
  debouncedUpdate();
}

mdEl.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
    e.preventDefault();
    redo();
  }
});

// Preview-only Mode
const previewToggle = document.getElementById("btn-preview");
const wrap = document.querySelector(".wrap");
const editorPanel = document.querySelector("main.wrap > section.panel:first-child");

previewToggle.addEventListener("click", () => {
  const isActive = wrap.classList.toggle("preview-only");
  editorPanel.classList.toggle("hidden", isActive);

  if (isActive) {
    previewToggle.textContent = "Exit Preview";
    statusEl.textContent = "Preview-only mode enabled";
  } else {
    previewToggle.textContent = "Preview Only";
    statusEl.textContent = "Editor mode enabled";
  }
});

// Syntax Highlighting Toggle (Prism.js)
const highlightBtn = document.getElementById("btn-highlight");
let highlightEnabled = false;

if (highlightBtn) {
  highlightBtn.addEventListener("click", () => {
    highlightEnabled = !highlightEnabled;
    statusEl.textContent = highlightEnabled
      ? "Syntax highlighting enabled"
      : "Syntax highlighting disabled";

    // re-render preview with highlighting
    applyHighlighting();
  });
}

function applyHighlighting() {
  if (!highlightEnabled) return;
  if (window.Prism) {
    Prism.highlightAllUnder(previewEl);
  }
}

// hook into update()
const originalUpdate = update;
update = function () {
  originalUpdate();
  applyHighlighting();
};

function renderMarkdown(raw){
  // normalize newlines & escape early
  let text = raw.replace(/\r\n?/g, '\n');
  text = escapeHTML(text);
  text = replaceEmoji(text);

  // ----- Protect code blocks by replacing them with tokens (so parsing won't alter them) -----
  const codeBlocks = [];
  text = text.replace(/```(\w+)?\n([\s\S]*?)\n```/g, (m, lang, code) => {
    const language = lang ? `language-${lang}` : '';
    const html = `<pre><code class="${language}">${code}</code></pre>`;
    const token = `\u0000CODEBLOCK${codeBlocks.length}\u0000`;
    codeBlocks.push(html);
    return token;
  });

  // indented code blocks (mask them too)
  text = text.replace(/(^|\n)(?:\t| {4})(.+(?:\n(?:\t| {4}).+)*)/g, (m, p1, code) => {
    const cleaned = code.replace(/^(?:\t| {4})/gm, '');
    const html = `${p1}<pre><code>${cleaned}</code></pre>`;
    const token = `\u0000CODEBLOCK${codeBlocks.length}\u0000`;
    codeBlocks.push(html);
    return token;
  });

  // ---- Tables (line-by-line detection) ----
  text = parseTables(text);

  // Horizontal rules
  text = text.replace(/(^|\n)([-*_]){3,}(?=\n|$)/g, '\n<hr/>\n');

  // Blockquotes
  text = text.replace(/(^|\n)> ?(.*(?:\n> ?.*)*)/g, (m, p1, content) => {
    const cleaned = content.replace(/^> ?/gm, '');
    return `${p1}<blockquote>${cleaned.replace(/\n/g,'<br/>')}</blockquote>`;
  });

  // Headings
  text = text.replace(/^### (.*)$/gm, '<h3>$1</h3>');
  text = text.replace(/^## (.*)$/gm, '<h2>$1</h2>');
  text = text.replace(/^# (.*)$/gm, '<h1>$1</h1>');

  // Images + links
  text = text.replace(/!\[(.*?)\]\((.*?)\)/g, '<img alt="$1" src="$2"/>');
  text = text.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // Bold / Italic / Inline code
  text = text.replace(/(\*\*|__)(.*?)\1/g, '<strong>$2</strong>');
  text = text.replace(/(\*|_)(.*?)\1/g, '<em>$2</em>');
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Ordered lists
  text = text.replace(/(?:^|\n)(?:\d+\. .+(?:\n|$))+/g, block => {
    const items = block.trim().split(/\n/).map(line => line.replace(/^\d+\. /, ''));
    return '<ol>\n' + items.map(i => `<li>${i}</li>`).join('\n') + '\n</ol>';
  });

  // Task lists
  text = text.replace(/(?:^|\n)(?:[-*+] \[[ xX]\] .+(?:\n|$))+/g, block => {
    const items = block.trim().split(/\n/).map(line => {
      const checked = /^[-*+] \[x\]/i.test(line);
      const label = line.replace(/^[-*+] \[[ xX]\] /, '');
      return `<li><input type="checkbox" disabled ${checked? 'checked':''}/> ${label}</li>`;
    });
    return '<ul class="task-list">\n' + items.join('\n') + '\n</ul>';
  });

  // Unordered lists
  text = text.replace(/(?:^|\n)(?:[-*+] .+(?:\n|$))+/g, block => {
    const items = block.trim().split(/\n/).map(line => line.replace(/^[-*+] /, ''));
    return '<ul>\n' + items.map(i => `<li>${i}</li>`).join('\n') + '\n</ul>';
  });

  // Footnotes & superscript (simple inline handling)
  text = text.replace(/\^(.+?)\^/g, '<sup>$1</sup>');
  text = text.replace(/\[\^(.+?)\]/g, '<sup id="fnref-$1">[<a href="#fn-$1">$1</a>]</sup>');

  // ---- Restore code block tokens back to their HTML ----
  for(let i=0;i<codeBlocks.length;i++){
    const token = new RegExp(`\u0000CODEBLOCK${i}\u0000`, 'g');
    text = text.replace(token, codeBlocks[i]);
  }
  if (window.Prism) {
    Prism.highlightAllUnder(previewEl);
  }

  // Paragraphs
  const blocks = text.split(/\n{2,}/).map(b => b.trim()).filter(Boolean).map(b => {
    if (/^<(h\d|ul|ol|pre|blockquote|hr|img|p|div|table)/.test(b)) return b;
    return `<p>${b.replace(/\n/g,'<br/>')}</p>`;
  });
  return blocks.join('\n\n');
}

function debounce(fn, wait=200){
  let t;
  return (...args)=>{ clearTimeout(t); t = setTimeout(()=>fn(...args), wait); };
}

// -----------------------------
// Auto Save Support
// -----------------------------
const AUTOSAVE_KEY = 'markdown-content';

function saveContent(){
  try { localStorage.setItem(AUTOSAVE_KEY, mdEl.value); } catch(e) {}
}

function loadContent(){
  try {
    return localStorage.getItem(AUTOSAVE_KEY);
  } catch(e){ return null; }
}

function update(){
  const raw = mdEl.value;
  statusEl.textContent = 'Rendering...';
  try{
    const html = renderMarkdown(raw);
    previewEl.innerHTML = html;
    statusEl.textContent = 'Rendered — ' + (raw.length) + ' chars';
    saveContent();
  }catch(e){
    previewEl.textContent = 'Render error: ' + e;
    statusEl.textContent = 'Error';
  }
}

const debouncedUpdate = debounce(update, 180);
mdEl.addEventListener('input', () => {
  saveState();
  debouncedUpdate();
});

// Initialize editor with saved content or default
const savedContent = loadContent();
if(savedContent){
  mdEl.value = savedContent;
}else{
  mdEl.value = `# Welcome\n\nType **Markdown** on the left.\n\n- [ ] Task not done\n- [x] Task done\n\n| Col1 | Col2 |\n| ---- | ---- |\n| A    | B    |\n| C    | D    |\n\nSuperscript: E=mc^2^\n\nFootnote ref [^1]\n\n[^1]: Footnote content here\n\nEmoji: :smile: :rocket:`;
}
update();

document.addEventListener('keydown', (e)=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase() === 'b'){
    e.preventDefault(); applyFormatting('bold');
  }
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase() === 'i'){
    e.preventDefault(); applyFormatting('italic');
  }
});

document.querySelectorAll('.btn[data-action]').forEach(btn=>{
  btn.addEventListener('click', ()=> applyFormatting(btn.getAttribute('data-action')));
});

function applyFormatting(action){
  saveState(); // Save current state before modifying

  const start = mdEl.selectionStart;
  const end = mdEl.selectionEnd;
  const selected = mdEl.value.slice(start,end);
  let replace;

  switch(action){
    case 'bold': replace = `**${selected || 'bold text'}**`; break;
    case 'italic': replace = `*${selected || 'italic text'}*`; break;
    case 'h1': replace = `# ${selected || 'Heading 1'}`; break;
    case 'h2': replace = `## ${selected || 'Heading 2'}`; break;
    case 'code': replace = `\`${selected || 'code'}\``; break;
    case 'codeblock': replace = `\n\`\`\`\n${selected || 'code here'}\n\`\`\`\n`; break;
    case 'ul': replace = (selected ? selected.split('\n').map(l=>l ? `- ${l}` : '').join('\n') : '- list item'); break;
    case 'ol': replace = (selected ? selected.split('\n').map((l,i)=>l ? `${i+1}. ${l}` : '').join('\n') : '1. list item'); break;
    default: replace = selected; break;
  }

  mdEl.setRangeText(replace, start, end, 'end');
  mdEl.focus();
  debouncedUpdate();
}

document.getElementById('btn-copy').addEventListener('click', async ()=>{
  try{
    await navigator.clipboard.writeText(previewEl.innerHTML);
    statusEl.textContent = 'HTML copied to clipboard';
  }catch(e){
    statusEl.textContent = 'Copy failed';
  }
});

document.getElementById('btn-export').addEventListener('click', ()=>{
  const html = `<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>Exported HTML</title></head><body>${previewEl.innerHTML}</body></html>`;
  const blob = new Blob([html], {type:'text/html'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'markdown-export.html'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  statusEl.textContent = 'Export started';
});

// -----------------------------
// Persistent Theme Preference
// -----------------------------
const THEME_KEY = 'theme';

function setTheme(theme, save = false){
  if(theme !== 'dark' && theme !== 'light') return;
  document.documentElement.setAttribute('data-theme', theme);
  themeToggle.textContent = theme === 'dark' ? '🌕' : '🌑';
  if(save) try{ localStorage.setItem(THEME_KEY, theme); }catch(e){}
}

function getSavedTheme(){
  try{
    const t = localStorage.getItem(THEME_KEY);
    return (t === 'dark' || t === 'light') ? t : null;
  }catch(e){ return null; }
}

function detectPreferredTheme(){
  if(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

(function initTheme(){
  const saved = getSavedTheme();
  const initial = saved || detectPreferredTheme();
  setTheme(initial, false);
  if(themeToggle){
    themeToggle.addEventListener('click', ()=>{
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      setTheme(next, true);
    });
  }
})();
