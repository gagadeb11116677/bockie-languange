import { Environment, Interpreter, BValue, BBuiltin } from './interpreter';

const ANSI = {
  reset: '\x1b[0m', clear: '\x1b[2J\x1b[H', hide: '\x1b[?25l', show: '\x1b[?25h',
  fg: (c: number) => `\x1b[38;5;${c}m`, cursor: (x: number, y: number) => `\x1b[${y + 1};${x + 1}H`,
};

interface Screen { width: number; height: number; buffer: string[][]; colors: (number | null)[][]; }
interface CanvasState {
  width: number; height: number;
  commands: any[];
  title: string; bgColor: string;
  frames: any[][];
  fps: number;
  inputKeys: string[];
  interactive: boolean;
  backgroundCommands: any[];
}

const screens: Map<number, Screen> = new Map();
let nextScreenId = 1;
const canvases: Map<number, CanvasState> = new Map();
let nextCanvasId = 1;

export class GameModule {
  static populate(env: Environment, interp: Interpreter) {
    const define = (name: string, fn: (...args: BValue[]) => BValue) => { env.define(name, { __type: 'builtin', name, fn } as BBuiltin); };

    define('screen_create', (...a) => { const id = nextScreenId++; screens.set(id, { width: a[0] as number, height: a[1] as number, buffer: Array.from({ length: a[1] as number }, () => Array(a[0] as number).fill(' ')), colors: Array.from({ length: a[1] as number }, () => Array(a[0] as number).fill(null)) }); return id; });
    define('screen_clear', (...a) => { const s = screens.get(a[0] as number); if (!s) return null; for (let y = 0; y < s.height; y++) for (let x = 0; x < s.width; x++) { s.buffer[y][x] = ' '; s.colors[y][x] = null; } return null; });
    define('screen_set', (...a) => { const s = screens.get(a[0] as number); if (!s) return null; const x = Math.floor(a[1] as number); const y = Math.floor(a[2] as number); if (x < 0 || x >= s.width || y < 0 || y >= s.height) return null; s.buffer[y][x] = (a[3] as string) || ' '; s.colors[y][x] = a.length > 4 ? (a[4] as number) : null; return null; });
    define('screen_get', (...a) => { const s = screens.get(a[0] as number); if (!s) return ' '; const x = Math.floor(a[1] as number); const y = Math.floor(a[2] as number); if (x < 0 || x >= s.width || y < 0 || y >= s.height) return ' '; return s.buffer[y][x]; });
    define('screen_render', (...a) => { const s = screens.get(a[0] as number); if (!s) return null; let out = ANSI.clear; for (let y = 0; y < s.height; y++) { for (let x = 0; x < s.width; x++) { const ch = s.buffer[y][x]; const c = s.colors[y][x]; out += c !== null ? ANSI.fg(c) + ch + ANSI.reset : ch; } out += '\n'; } process.stdout.write(out); return null; });
    define('screen_width', (...a) => screens.get(a[0] as number)?.width || 0);
    define('screen_height', (...a) => screens.get(a[0] as number)?.height || 0);
    define('screen_draw_text', (...a) => { const s = screens.get(a[0] as number); if (!s) return null; const x = Math.floor(a[1] as number); const y = Math.floor(a[2] as number); const t = a[3] as string; const c = a.length > 4 ? (a[4] as number) : null; for (let i = 0; i < t.length; i++) if (x + i < s.width && y < s.height && y >= 0) { s.buffer[y][x + i] = t[i]; s.colors[y][x + i] = c; } return null; });
    define('screen_draw_rect', (...a) => { const s = screens.get(a[0] as number); if (!s) return null; const x = Math.floor(a[1] as number); const y = Math.floor(a[2] as number); const w = Math.floor(a[3] as number); const h = Math.floor(a[4] as number); const ch = (a[5] as string) || '#'; const c = a.length > 6 ? (a[6] as number) : null; for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) { const px = x + dx, py = y + dy; if (px >= 0 && px < s.width && py >= 0 && py < s.height) { s.buffer[py][px] = ch; s.colors[py][px] = c; } } return null; });
    define('screen_draw_line', (...a) => { const s = screens.get(a[0] as number); if (!s) return null; const x0 = Math.floor(a[1] as number); const y0 = Math.floor(a[2] as number); const x1 = Math.floor(a[3] as number); const y1 = Math.floor(a[4] as number); const ch = (a[5] as string) || '*'; const c = a.length > 6 ? (a[6] as number) : null; let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0); const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let err = dx - dy, cx = x0, cy = y0; while (true) { if (cx >= 0 && cx < s.width && cy >= 0 && cy < s.height) { s.buffer[cy][cx] = ch; s.colors[cy][cx] = c; } if (cx === x1 && cy === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; cx += sx; } if (e2 < dx) { err += dx; cy += sy; } } return null; });
    define('screen_draw_circle', (...a) => { const s = screens.get(a[0] as number); if (!s) return null; const cx = a[1] as number; const cy = a[2] as number; const r = a[3] as number; const ch = (a[4] as string) || '*'; const c = a.length > 5 ? (a[5] as number) : null; for (let angle = 0; angle < 360; angle += 1) { const rad = angle * Math.PI / 180; const x = Math.floor(cx + r * Math.cos(rad)); const y = Math.floor(cy + r * Math.sin(rad)); if (x >= 0 && x < s.width && y >= 0 && y < s.height) { s.buffer[y][x] = ch; s.colors[y][x] = c; } } return null; });

    define('canvas_create', (...a) => { const id = nextCanvasId++; canvases.set(id, { width: a[0] as number, height: a[1] as number, commands: [], title: 'Bockie Game', bgColor: '#0a0a0a', frames: [], fps: 30, inputKeys: [], interactive: false, backgroundCommands: [] }); return id; });
    define('canvas_title', (...a) => { const c = canvases.get(a[0] as number); if (c) c.title = a[1] as string; return null; });
    define('canvas_bg', (...a) => { const c = canvases.get(a[0] as number); if (c) c.bgColor = a[1] as string; return null; });
    define('canvas_clear', (...a) => { const c = canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op: 'clear', color: a.length > 1 ? (a[1] as string) : c.bgColor }); return null; });
    define('canvas_rect', (...a) => { const c = canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op: 'rect', x: a[1], y: a[2], w: a[3], h: a[4], color: a[5], fill: a.length > 6 ? (a[6] as boolean) : true }); return null; });
    define('canvas_circle', (...a) => { const c = canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op: 'circle', x: a[1], y: a[2], r: Math.max(0, a[3] as number), color: a[4], fill: a.length > 5 ? (a[5] as boolean) : true }); return null; });
    define('canvas_line', (...a) => { const c = canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op: 'line', x1: a[1], y1: a[2], x2: a[3], y2: a[4], color: a[5], width: a.length > 6 ? (a[6] as number) : 1 }); return null; });
    define('canvas_text', (...a) => { const c = canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op: 'text', x: a[1], y: a[2], text: a[3], color: a[4], size: a.length > 5 ? (a[5] as number) : 16 }); return null; });
    define('canvas_pixel', (...a) => { const c = canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op: 'pixel', x: a[1], y: a[2], color: a[3] }); return null; });
    define('canvas_ellipse', (...a) => { const c = canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op: 'ellipse', x: a[1], y: a[2], rx: Math.max(0, a[3] as number), ry: Math.max(0, a[4] as number), color: a[5], fill: a.length > 6 ? (a[6] as boolean) : true }); return null; });
    define('canvas_polygon', (...a) => { const c = canvases.get(a[0] as number); if (!c) return null; const pl = a[1] as any; const pts = (pl.items || pl).map((p: any) => p.items ? { x: p.items[0], y: p.items[1] } : p); c.commands.push({ op: 'polygon', points: pts, color: a[2], fill: a.length > 3 ? (a[3] as boolean) : true }); return null; });
    define('canvas_arc', (...a) => { const c = canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op: 'arc', x: a[1], y: a[2], r: Math.max(0, a[3] as number), start: a[4], end: a[5], color: a[6] }); return null; });
    define('canvas_gradient_rect', (...a) => { const c = canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op: 'gradient_rect', x: a[1], y: a[2], w: a[3], h: a[4], color1: a[5], color2: a[6], direction: a.length > 7 ? (a[7] as string) : 'vertical' }); return null; });
    define('canvas_shadow_text', (...a) => { const c = canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op: 'shadow_text', x: a[1], y: a[2], text: a[3], color: a[4], shadowColor: a.length > 5 ? (a[5] as string) : '#000', size: a.length > 6 ? (a[6] as number) : 16, blur: a.length > 7 ? (a[7] as number) : 4 }); return null; });
    define('canvas_width', (...a) => canvases.get(a[0] as number)?.width || 0);
    define('canvas_height', (...a) => canvases.get(a[0] as number)?.height || 0);

    define('canvas_next_frame', (...a) => {
      const c = canvases.get(a[0] as number);
      if (!c) return null;
      c.frames.push([...c.commands]);
      c.commands = [];
      return null;
    });
    define('canvas_set_fps', (...a) => { const c = canvases.get(a[0] as number); if (c) c.fps = a[1] as number; return null; });
    define('canvas_add_input', (...a) => { const c = canvases.get(a[0] as number); if (c) { c.interactive = true; c.inputKeys.push(a[1] as string); } return null; });
    define('canvas_flush', (...a) => { const c = canvases.get(a[0] as number); if (c) c.commands = []; return null; });
    define('canvas_set_background', (...a) => { const c = canvases.get(a[0] as number); if (!c) return null; c.backgroundCommands = [...c.commands]; c.commands = []; return null; });

    define('canvas_save_html', (...a) => { const c = canvases.get(a[0] as number); if (!c) return null; const fn = a[1] as string; const fs = require('fs'); fs.writeFileSync(fn, this.generateHTML(c), 'utf-8'); return fn; });
    define('canvas_save_game', (...a) => {
      const c = canvases.get(a[0] as number);
      if (!c) return null;
      if (c.commands.length > 0) c.frames.push([...c.commands]);
      const fn = a[1] as string;
      require('fs').writeFileSync(fn, this.generateGameHTML(c), 'utf-8');
      return fn;
    });
    define('canvas_play', (...a) => {
      const c = canvases.get(a[0] as number);
      if (!c) return null;
      if (c.commands.length > 0) c.frames.push([...c.commands]);
      const fs = require('fs'), path = require('path'), os = require('os');
      const tf = path.join(os.tmpdir(), `bockie_game_${Date.now()}.html`);
      fs.writeFileSync(tf, this.generateGameHTML(c), 'utf-8');
      let cmd: string;
      if (process.platform === 'win32') cmd = `start "" "${tf}"`;
      else if (process.platform === 'darwin') cmd = `open "${tf}"`;
      else cmd = `xdg-open "${tf}"`;
      try { require('child_process').exec(cmd, () => {}); return tf; } catch (e) { return null; }
    });
    define('canvas_play_static', (...a) => {
      const c = canvases.get(a[0] as number);
      if (!c) return null;
      const fs = require('fs'), path = require('path'), os = require('os');
      const tf = path.join(os.tmpdir(), `bockie_game_${Date.now()}.html`);
      fs.writeFileSync(tf, this.generateHTML(c), 'utf-8');
      let cmd: string;
      if (process.platform === 'win32') cmd = `start "" "${tf}"`;
      else if (process.platform === 'darwin') cmd = `open "${tf}"`;
      else cmd = `xdg-open "${tf}"`;
      try { require('child_process').exec(cmd, () => {}); return tf; } catch (e) { return null; }
    });

    define('term_clear', () => { process.stdout.write(ANSI.clear); return null; });
    define('term_hide_cursor', () => { process.stdout.write(ANSI.hide); return null; });
    define('term_show_cursor', () => { process.stdout.write(ANSI.show); return null; });
    define('term_set_cursor', (...a) => { process.stdout.write(ANSI.cursor(a[0] as number, a[1] as number)); return null; });
    define('term_color', (...a) => { process.stdout.write(ANSI.fg(a[0] as number)); return null; });
    define('term_reset_color', () => { process.stdout.write(ANSI.reset); return null; });
    define('term_set_raw', (...a) => { try { if (process.stdin.isTTY) process.stdin.setRawMode(a[0] as boolean); } catch (e) {} return null; });
    define('term_width', () => process.stdout.columns || 80);
    define('term_height', () => process.stdout.rows || 24);
    define('key_get', () => { try { const buf = Buffer.alloc(1); const n = require('fs').readSync(0, buf, 0, 1); return n === 0 ? '' : String.fromCharCode(buf[0]); } catch (e) { return ''; } });

    // ===================================================================
    // v3.2.3 — CROSS-PLATFORM key_wait()
    // -------------------------------------------------------------------
    // v3.2.2 BUG: `fs.readSync(0, ...)` returns 0 / throws immediately
    // on Windows PowerShell because:
    //   1. PowerShell's stdin is line-buffered (cooked mode) by default
    //   2. Without setRawMode, readSync returns EAGAIN/empty on Windows
    //   3. Even with setRawMode, Windows console handles differ from Unix
    //
    // FIX: Three-tier fallback strategy.
    //   Tier 1 (Unix TTY): setRawMode + readSync (fast, original behavior)
    //   Tier 2 (Windows): spawn PowerShell `Read-Host` / [Console]::ReadKey
    //   Tier 3 (Any OS): use readline synchronously via spawnSync
    // ===================================================================
    define('key_wait', () => {
      const isWindows = process.platform === 'win32';
      const fs = require('fs');
      const cp = require('child_process');

      // ----- Tier 1: Unix-style raw mode + readSync (works on Linux/Mac TTY) -----
      if (!isWindows && process.stdin.isTTY) {
        try {
          const wasRaw = (process.stdin as any).isRaw || false;
          process.stdin.setRawMode(true);
          // Loop until at least 1 byte is read (in case of EAGAIN)
          const buf = Buffer.alloc(3);
          let n = 0;
          for (let attempt = 0; attempt < 50 && n === 0; attempt++) {
            n = fs.readSync(0, buf, 0, 3);
            if (n === 0) { // sleep 10ms to avoid busy loop
              const start = Date.now(); while (Date.now() - start < 10) {}
            }
          }
          if (!wasRaw) process.stdin.setRawMode(false);
          if (n === 0) return '';
          if (n === 3 && buf[0] === 0x1b && buf[1] === 0x5b) {
            switch (buf[2]) {
              case 0x41: return 'up';
              case 0x42: return 'down';
              case 0x43: return 'right';
              case 0x44: return 'left';
            }
          }
          return String.fromCharCode(buf[0]);
        } catch (e) {
          try { process.stdin.setRawMode(false); } catch (_) {}
          // fall through to Tier 2/3
        }
      }

      // ----- Tier 2: Windows — spawn PowerShell [Console]::ReadKey -----
      if (isWindows) {
        try {
          // PowerShell snippet: read one keypress, output its char (or escape-name for arrows)
          const psScript =
            '$k = [Console]::ReadKey($true); ' +
            'if ($k.Key -eq "UpArrow") { "up" } ' +
            'elseif ($k.Key -eq "DownArrow") { "down" } ' +
            'elseif ($k.Key -eq "LeftArrow") { "left" } ' +
            'elseif ($k.Key -eq "RightArrow") { "right" } ' +
            'elseif ($k.Key -eq "Enter") { "" } ' +
            'elseif ($k.Key -eq "Escape") { "" } ' +
            'elseif ($k.Key -eq "Spacebar") { " " } ' +
            'elseif ($k.Key -eq "Backspace") { "" } ' +
            'else { [string]$k.KeyChar }';
          const r = cp.spawnSync('powershell',
            ['-NoProfile', '-NonInteractive', '-Command', psScript],
            { encoding: 'utf-8', timeout: 30000 }
          );
          const out = (r.stdout || '').trim();
          return out;
        } catch (e) {
          // fall through to Tier 3
        }
      }

      // ----- Tier 3: Generic fallback — line-mode readline via spawnSync -----
      // Reads a full line (waits for Enter). Less granular but always works.
      try {
        const cmd = isWindows ? 'cmd' : '/bin/sh';
        const args = isWindows ? ['/c', 'set /p='] : ['-c', 'read -n1 line; printf "%s" "$line"'];
        const r = cp.spawnSync(cmd, args, { encoding: 'utf-8', input: '', timeout: 30000 });
        const ch = (r.stdout || '').charAt(0);
        return ch;
      } catch (e) {
        return '';
      }
    });
    define('beep', () => { process.stdout.write('\x07'); return null; });

    define('color_rgb', (...a) => { const r = a[0] as number; const g = a[1] as number; const b = a[2] as number; return '#' + [r, g, b].map(c => Math.max(0, Math.min(255, Math.floor(c))).toString(16).padStart(2, '0')).join(''); });
    define('color_hsl', (...a) => { const h = a[0] as number; const s = a[1] as number; const l = a[2] as number; const c = this.hslToRgb(h / 360, s / 100, l / 100); return '#' + c.map(x => Math.floor(x).toString(16).padStart(2, '0')).join(''); });
    define('color_random', () => { return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'); });
  }

  static hslToRgb(h: number, s: number, l: number): [number, number, number] {
    let r: number, g: number, b: number;
    if (s === 0) { r = g = b = l; } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return [r * 255, g * 255, b * 255];
  }

  static generateHTML(c: CanvasState): string {
    const frameJSON = JSON.stringify(c.commands);
    return this.generateGameHTML({ ...c, frames: [[...c.commands]], fps: 0 });
  }

  static generateGameHTML(c: CanvasState): string {
    const framesJSON = JSON.stringify(c.frames.length > 0 ? c.frames : [c.commands]);
    const bgJSON = JSON.stringify(c.backgroundCommands || []);
    const fps = c.fps || 30;
    const frameCount = c.frames.length > 0 ? c.frames.length : 1;
    const isAnimated = frameCount > 1;

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${this.escapeHTML(c.title)}</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #0a0a0a; color: #e0e0e0; font-family: 'Courier New', monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
h1 { color: #ffaa00; margin-bottom: 8px; font-size: 1.4em; text-shadow: 0 0 15px rgba(255,170,0,0.4); }
.canvas-wrap { border: 2px solid #333; border-radius: 8px; overflow: hidden; box-shadow: 0 0 40px rgba(0,0,0,0.9), 0 0 80px rgba(255,170,0,0.05); }
canvas { display: block; background: ${this.escapeHTML(c.bgColor)}; image-rendering: pixelated; image-rendering: crisp-edges; }
.controls { margin-top: 15px; display: flex; gap: 10px; align-items: center; }
.btn { background: #1a1a2e; color: #ffaa00; border: 1px solid #333; padding: 8px 20px; border-radius: 5px; cursor: pointer; font-family: 'Courier New', monospace; font-size: 14px; transition: all 0.2s; }
.btn:hover { background: #222244; border-color: #ffaa00; box-shadow: 0 0 10px rgba(255,170,0,0.3); }
.btn:active { transform: scale(0.95); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }
.info { color: #666; font-size: 13px; }
.speed-control { display: flex; align-items: center; gap: 8px; }
.speed-control input { width: 100px; accent-color: #ffaa00; }
.speed-label { color: #888; font-size: 12px; min-width: 40px; }
.footer { margin-top: 18px; color: #444; font-size: 12px; text-align: center; }
.footer a { color: #ffaa00; text-decoration: none; }
.footer strong { color: #666; }
</style>
</head>
<body>
<h1>${this.escapeHTML(c.title)}</h1>
<div class="canvas-wrap"><canvas id="game" width="${c.width}" height="${c.height}"></canvas></div>
${isAnimated ? `<div class="controls">
  <button class="btn" id="playBtn" onclick="togglePlay()">Play</button>
  <button class="btn" onclick="restart()">Restart</button>
  <div class="speed-control">
    <span class="speed-label">Speed:</span>
    <input type="range" id="speedSlider" min="0.1" max="3" step="0.1" value="1" onchange="updateSpeed()">
    <span class="speed-label" id="speedLabel">1.0x</span>
  </div>
  <span class="info" id="frameInfo">Frame: 0 / ${frameCount}</span>
</div>` : ''}
<div class="footer">Made with <strong>Bockie</strong> · Created by <strong>xobe</strong> · <a href="https://github.com/gagadeb11116677/bockie-languange">GitHub</a></div>
<script>
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const frames = ${framesJSON};
const bgCommands = ${bgJSON};
const totalFrames = ${frameCount};
const isAnimated = ${isAnimated};
const defaultFPS = ${fps};
let currentFrame = 0;
let playing = ${isAnimated ? 'false' : 'false'};
let speed = 1.0;
let lastTime = 0;
let accumulator = 0;

function drawFrame(commands) {
  for (const cmd of commands) {
    switch (cmd.op) {
      case 'clear': ctx.fillStyle = cmd.color; ctx.fillRect(0, 0, canvas.width, canvas.height); break;
      case 'rect': ctx.fillStyle = cmd.color; ctx.strokeStyle = cmd.color; if (cmd.fill) ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h); else ctx.strokeRect(cmd.x, cmd.y, cmd.w, cmd.h); break;
      case 'circle': ctx.fillStyle = cmd.color; ctx.strokeStyle = cmd.color; ctx.beginPath(); ctx.arc(cmd.x, cmd.y, Math.max(0, cmd.r), 0, 2 * Math.PI); if (cmd.fill) ctx.fill(); else ctx.stroke(); break;
      case 'ellipse': ctx.fillStyle = cmd.color; ctx.strokeStyle = cmd.color; ctx.beginPath(); ctx.ellipse(cmd.x, cmd.y, Math.max(0, cmd.rx), Math.max(0, cmd.ry), 0, 0, 2 * Math.PI); if (cmd.fill) ctx.fill(); else ctx.stroke(); break;
      case 'line': ctx.strokeStyle = cmd.color; ctx.lineWidth = cmd.width || 1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cmd.x1, cmd.y1); ctx.lineTo(cmd.x2, cmd.y2); ctx.stroke(); break;
      case 'text': ctx.fillStyle = cmd.color; ctx.font = (cmd.size || 16) + 'px monospace'; ctx.textBaseline = 'top'; ctx.fillText(cmd.text, cmd.x, cmd.y); break;
      case 'pixel': ctx.fillStyle = cmd.color; ctx.fillRect(cmd.x, cmd.y, 1, 1); break;
      case 'polygon': ctx.fillStyle = cmd.color; ctx.strokeStyle = cmd.color; ctx.beginPath(); cmd.points.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }); ctx.closePath(); if (cmd.fill) ctx.fill(); else ctx.stroke(); break;
      case 'arc': ctx.strokeStyle = cmd.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cmd.x, cmd.y, Math.max(0, cmd.r), (cmd.start || 0) * Math.PI / 180, (cmd.end || 360) * Math.PI / 180); ctx.stroke(); break;
      case 'gradient_rect': const grad = cmd.direction === 'horizontal' ? ctx.createLinearGradient(cmd.x, 0, cmd.x + cmd.w, 0) : ctx.createLinearGradient(0, cmd.y, 0, cmd.y + cmd.h); grad.addColorStop(0, cmd.color1); grad.addColorStop(1, cmd.color2); ctx.fillStyle = grad; ctx.fillRect(cmd.x, cmd.y, cmd.w, cmd.h); break;
      case 'shadow_text': ctx.save(); ctx.shadowColor = cmd.shadowColor || '#000'; ctx.shadowBlur = cmd.blur || 4; ctx.fillStyle = cmd.color; ctx.font = (cmd.size || 16) + 'px monospace'; ctx.textBaseline = 'top'; ctx.fillText(cmd.text, cmd.x, cmd.y); ctx.restore(); break;
    }
  }
}

function updateInfo() {
  const info = document.getElementById('frameInfo');
  if (info) info.textContent = 'Frame: ' + (currentFrame + 1) + ' / ' + totalFrames;
  const sp = document.getElementById('speedLabel');
  if (sp) sp.textContent = speed.toFixed(1) + 'x';
}

let bgDrawn = false;
function render() {
  if (currentFrame < frames.length) {
    ctx.fillStyle = '${c.bgColor}';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (bgCommands.length > 0) drawFrame(bgCommands);
    drawFrame(frames[currentFrame]);
    updateInfo();
  }
}

function nextFrame() {
  if (currentFrame < totalFrames - 1) {
    currentFrame++;
    render();
  } else {
    playing = false;
    const btn = document.getElementById('playBtn');
    if (btn) btn.textContent = 'Replay';
  }
}

function animate(timestamp) {
  if (!playing) return;
  if (!lastTime) lastTime = timestamp;
  const delta = timestamp - lastTime;
  lastTime = timestamp;
  accumulator += delta;
  const frameDuration = 1000 / (defaultFPS * speed);
  while (accumulator >= frameDuration) {
    accumulator -= frameDuration;
    nextFrame();
    if (!playing) break;
  }
  if (playing) requestAnimationFrame(animate);
}

function togglePlay() {
  if (currentFrame >= totalFrames - 1) { currentFrame = 0; render(); }
  playing = !playing;
  const btn = document.getElementById('playBtn');
  if (btn) btn.textContent = playing ? 'Pause' : 'Play';
  if (playing) { lastTime = 0; accumulator = 0; requestAnimationFrame(animate); }
}

function restart() {
  currentFrame = 0;
  playing = false;
  const btn = document.getElementById('playBtn');
  if (btn) btn.textContent = 'Play';
  render();
}

function updateSpeed() {
  const slider = document.getElementById('speedSlider');
  speed = parseFloat(slider.value);
  updateInfo();
}

render();
if (isAnimated) {
  setTimeout(() => { togglePlay(); }, 500);
}
</script>
</body>
</html>`;
  }

  static escapeHTML(s: string): string { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
}
