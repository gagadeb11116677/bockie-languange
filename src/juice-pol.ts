// Created by xobe

import { Interpreter, BValue, BList, BDict, BBuiltin, BockieError } from './interpreter';

const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  italic: '\x1b[3m',
  underline: '\x1b[4m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgBlack: '\x1b[40m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCyan: '\x1b[46m',
  bgWhite: '\x1b[47m',
  brightBlack: '\x1b[90m',
  brightRed: '\x1b[91m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightBlue: '\x1b[94m',
  brightMagenta: '\x1b[95m',
  brightCyan: '\x1b[96m',
  brightWhite: '\x1b[97m',
};

const COLOR_MAP: Record<string, string> = {
  black: C.black, red: C.red, green: C.green, yellow: C.yellow,
  blue: C.blue, magenta: C.magenta, cyan: C.cyan, white: C.white,
  gray: C.brightBlack, grey: C.brightBlack,
  bright_red: C.brightRed, bright_green: C.brightGreen, bright_yellow: C.brightYellow,
  bright_blue: C.brightBlue, bright_magenta: C.brightMagenta, bright_cyan: C.brightCyan,
  bright_white: C.brightWhite,
};

export class JuicePol {
  static populate(interp: Interpreter, env: any) {
    const bind = (name: string, fn: (...args: BValue[]) => BValue) => {
      env.define(name, { __type: 'builtin', name, fn } as BBuiltin);
    };
    const out = (s: string) => interp.output(s);
    const toStr = (v: BValue) => interp.toDisplay(v);

    // ============ COLOR / STYLE ============
    bind('juice_color', (...a) => {
      const text = a[0] !== null && a[0] !== undefined ? toStr(a[0]) : '';
      const color = (a.length > 1 ? toStr(a[1]) : 'white').toLowerCase();
      const code = COLOR_MAP[color] || C.white;
      return code + text + C.reset;
    });
    bind('juice_bold', (...a) => C.bold + (a[0] !== null ? toStr(a[0]) : '') + C.reset);
    bind('juice_dim', (...a) => C.dim + (a[0] !== null ? toStr(a[0]) : '') + C.reset);
    bind('juice_italic', (...a) => C.italic + (a[0] !== null ? toStr(a[0]) : '') + C.reset);
    bind('juice_underline', (...a) => C.underline + (a[0] !== null ? toStr(a[0]) : '') + C.reset);
    bind('juice_red', (...a) => C.red + (a[0] !== null ? toStr(a[0]) : '') + C.reset);
    bind('juice_green', (...a) => C.green + (a[0] !== null ? toStr(a[0]) : '') + C.reset);
    bind('juice_yellow', (...a) => C.yellow + (a[0] !== null ? toStr(a[0]) : '') + C.reset);
    bind('juice_blue', (...a) => C.blue + (a[0] !== null ? toStr(a[0]) : '') + C.reset);
    bind('juice_cyan', (...a) => C.cyan + (a[0] !== null ? toStr(a[0]) : '') + C.reset);
    bind('juice_magenta', (...a) => C.magenta + (a[0] !== null ? toStr(a[0]) : '') + C.reset);
    bind('juice_rainbow', (...a) => {
      const text = a[0] !== null ? toStr(a[0]) : '';
      const colors = [C.red, C.yellow, C.green, C.cyan, C.blue, C.magenta];
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += colors[i % colors.length] + text[i];
      }
      return result + C.reset;
    });

    // ============ TEXT FORMATTING ============
    bind('juice_center', (...a) => {
      const text = a[0] !== null ? toStr(a[0]) : '';
      const width = (a.length > 1 ? a[1] as number : 40);
      const pad = Math.max(0, width - text.length);
      const left = Math.floor(pad / 2);
      const right = pad - left;
      return ' '.repeat(left) + text + ' '.repeat(right);
    });
    bind('juice_pad_left', (...a) => {
      const text = a[0] !== null ? toStr(a[0]) : '';
      const width = (a.length > 1 ? a[1] as number : 20);
      const ch = a.length > 2 ? toStr(a[2]).charAt(0) || ' ' : ' ';
      return text.padStart(width, ch);
    });
    bind('juice_pad_right', (...a) => {
      const text = a[0] !== null ? toStr(a[0]) : '';
      const width = (a.length > 1 ? a[1] as number : 20);
      const ch = a.length > 2 ? toStr(a[2]).charAt(0) || ' ' : ' ';
      return text.padEnd(width, ch);
    });
    bind('juice_repeat', (...a) => {
      const ch = a[0] !== null ? toStr(a[0]) : ' ';
      const n = Math.max(0, Math.floor(a.length > 1 ? a[1] as number : 1));
      return ch.repeat(n);
    });
    bind('juice_truncate', (...a) => {
      const text = a[0] !== null ? toStr(a[0]) : '';
      const max = (a.length > 1 ? a[1] as number : 40);
      if (text.length <= max) return text;
      return text.substring(0, Math.max(0, max - 3)) + '...';
    });

    // ============ BOX DRAWING ============
    bind('juice_box', (...a) => {
      const text = a[0] !== null ? toStr(a[0]) : '';
      const lines = text.split('\n');
      const w = Math.max(...lines.map(l => l.length)) + 4;
      const top = '┌' + '─'.repeat(w) + '┐';
      const bot = '└' + '─'.repeat(w) + '┘';
      const mid = lines.map(l => '│ ' + l + ' '.repeat(w - 2 - l.length) + ' │').join('\n');
      return top + '\n' + mid + '\n' + bot;
    });
    bind('juice_box_title', (...a) => {
      const title = a[0] !== null ? toStr(a[0]) : '';
      const content = a.length > 1 && a[1] !== null ? toStr(a[1]) : '';
      const lines = content.split('\n');
      const w = Math.max(title.length + 2, ...lines.map(l => l.length + 2), 8);
      const top = '┌ ' + title + ' ' + '─'.repeat(Math.max(0, w - title.length - 2)) + '┐';
      const bot = '└' + '─'.repeat(w + 2) + '┘';
      const mid = lines.length > 0
        ? lines.map(l => '│ ' + l + ' '.repeat(Math.max(0, w - l.length)) + ' │').join('\n')
        : '│' + ' '.repeat(w) + '│';
      return top + '\n' + mid + '\n' + bot;
    });
    bind('juice_line', (...a) => {
      const w = (a.length > 0 ? a[1] as number : (a.length > 0 && typeof a[0] === 'number' ? a[0] as number : 40));
      const ch = (a.length > 1 && typeof a[1] === 'string') ? toStr(a[1]).charAt(0) : '─';
      return ch.repeat(w);
    });
    bind('juice_divider', (...a) => {
      const w = (a.length > 0 ? a[0] as number : 40);
      return '─'.repeat(w);
    });
    bind('juice_header', (...a) => {
      const text = a[0] !== null ? toStr(a[0]) : '';
      const w = a.length > 1 ? a[1] as number : 40;
      const pad = Math.max(0, w - text.length - 2);
      const left = Math.floor(pad / 2);
      const right = pad - left;
      return '─'.repeat(left) + ' ' + C.bold + text + C.reset + ' ' + '─'.repeat(right);
    });

    // ============ ALERT BOXES ============
    const alertBox = (label: string, text: string, color: string) => {
      const lines = text.split('\n');
      const w = Math.max(label.length + 4, ...lines.map(l => l.length + 4), 10);
      const top = color + '╔═' + label + '═' + '═'.repeat(Math.max(0, w - label.length - 2)) + '╗' + C.reset;
      const bot = color + '╚' + '═'.repeat(w) + '╝' + C.reset;
      const mid = lines.map(l => color + '║ ' + C.reset + l + ' '.repeat(Math.max(0, w - 4 - l.length)) + color + ' ║' + C.reset).join('\n');
      return top + '\n' + mid + '\n' + bot;
    };
    bind('juice_success', (...a) => alertBox('SUCCESS', a[0] !== null ? toStr(a[0]) : '', C.green));
    bind('juice_error', (...a) => alertBox('ERROR', a[0] !== null ? toStr(a[0]) : '', C.red));
    bind('juice_warn', (...a) => alertBox('WARN', a[0] !== null ? toStr(a[0]) : '', C.yellow));
    bind('juice_info', (...a) => alertBox('INFO', a[0] !== null ? toStr(a[0]) : '', C.blue));

    // ============ TABLE ============
    bind('juice_table', (...a) => {
      const headers = a[0] as BList;
      const rows = a.length > 1 ? a[1] as BList : null;
      const hItems = headers && headers.__type === 'list' ? headers.items : [];
      const rItems = rows && rows.__type === 'list' ? rows.items : [];
      const cols = hItems.length;
      const widths: number[] = new Array(cols).fill(0);
      for (let i = 0; i < cols; i++) widths[i] = Math.max(widths[i], toStr(hItems[i]).length);
      for (const r of rItems) {
        if (typeof r === 'object' && r !== null && '__type' in r && r.__type === 'list') {
          for (let i = 0; i < Math.min(cols, r.items.length); i++) {
            widths[i] = Math.max(widths[i], toStr(r.items[i]).length);
          }
        }
      }
      const line = '┌' + widths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
      const sep = '├' + widths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
      const bot = '└' + widths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';
      const hdr = '│ ' + hItems.map((h, i) => C.bold + toStr(h).padEnd(widths[i]) + C.reset).join(' │ ') + ' │';
      const body = rItems.map(r => {
        const items = (typeof r === 'object' && r !== null && '__type' in r && r.__type === 'list') ? r.items : [];
        return '│ ' + Array.from({length: cols}, (_, i) => toStr(items[i] ?? '').padEnd(widths[i])).join(' │ ') + ' │';
      }).join('\n');
      return [line, hdr, sep, body, bot].filter(Boolean).join('\n');
    });

    // ============ PROGRESS BAR ============
    bind('juice_progress', (...a) => {
      const cur = Math.max(0, a[0] as number);
      const total = Math.max(1, a[1] as number);
      const width = a.length > 2 ? a[2] as number : 30;
      const pct = Math.min(1, cur / total);
      const filled = Math.floor(pct * width);
      const empty = width - filled;
      const bar = C.green + '█'.repeat(filled) + C.brightBlack + '░'.repeat(empty) + C.reset;
      const pctStr = (pct * 100).toFixed(1) + '%';
      return '[' + bar + '] ' + pctStr + ' (' + cur + '/' + total + ')';
    });
    bind('juice_spinner', (...a) => {
      const idx = Math.max(0, a[0] as number);
      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      return C.cyan + frames[idx % frames.length] + C.reset;
    });

    // ============ INPUT HELPERS ============
    bind('juice_input', (...a) => {
      const prompt = a[0] !== null && a[0] !== undefined ? toStr(a[0]) : '';
      if (prompt) out(C.cyan + '▸ ' + prompt + ': ' + C.reset);
      return interp.inputFn();
    });
    bind('juice_confirm', (...a) => {
      const prompt = a[0] !== null && a[0] !== undefined ? toStr(a[0]) : 'Confirm';
      for (let i = 0; i < 5; i++) {
        out(C.yellow + '? ' + prompt + ' [y/N]: ' + C.reset);
        const s = interp.inputFn().trim().toLowerCase();
        if (s === 'y' || s === 'yes' || s === 'ya') return true;
        if (s === 'n' || s === 'no' || s === 'tidak') return false;
        out(C.red + 'Please answer y or n\n' + C.reset);
      }
      return false;
    });
    bind('juice_ask', (...a) => {
      const prompt = a[0] !== null && a[0] !== undefined ? toStr(a[0]) : 'Choose';
      const options = a.length > 1 && a[1] !== null && typeof a[1] === 'object' && '__type' in (a[1] as any) && (a[1] as any).__type === 'list' ? (a[1] as BList).items : [];
      for (let i = 0; i < options.length; i++) {
        out(C.cyan + '  ' + (i + 1) + '. ' + C.reset + toStr(options[i]) + '\n');
      }
      for (let i = 0; i < 5; i++) {
        out(C.yellow + '? ' + prompt + ' (1-' + options.length + '): ' + C.reset);
        const s = interp.inputFn().trim();
        const n = parseInt(s, 10);
        if (!isNaN(n) && n >= 1 && n <= options.length) return options[n - 1];
        out(C.red + 'Invalid choice\n' + C.reset);
      }
      return null;
    });
    bind('juice_pause', (...a) => {
      const msg = a[0] !== null && a[0] !== undefined ? toStr(a[0]) : 'Press Enter to continue...';
      out(C.dim + msg + C.reset);
      interp.inputFn();
      return null;
    });

    // ============ FORMATTERS ============
    bind('juice_format_money', (...a) => {
      const n = a[0] as number;
      const sym = a.length > 1 ? toStr(a[1]) : 'Rp';
      const decimals = a.length > 2 ? a[2] as number : 0;
      const num = n.toFixed(decimals);
      const [intPart, decPart] = num.split('.');
      const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return sym + ' ' + withCommas + (decPart ? ',' + decPart : '');
    });
    bind('juice_format_bytes', (...a) => {
      let n = a[0] as number;
      const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
      let i = 0;
      while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
      return n.toFixed(i === 0 ? 0 : 2) + ' ' + units[i];
    });
    bind('juice_format_time', (...a) => {
      const sec = Math.floor(a[0] as number);
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      const pad = (x: number) => x.toString().padStart(2, '0');
      return h > 0 ? pad(h) + ':' + pad(m) + ':' + pad(s) : pad(m) + ':' + pad(s);
    });
    bind('juice_format_number', (...a) => {
      const n = a[0] as number;
      const decimals = a.length > 1 ? a[1] as number : 2;
      const [intPart, decPart] = n.toFixed(decimals).split('.');
      return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (decPart ? ',' + decPart : '');
    });

    // ============ BANNER ============
    bind('juice_banner', (...a) => {
      const text = a[0] !== null ? toStr(a[0]) : '';
      const w = Math.max(text.length + 6, 30);
      const top = C.cyan + '╔' + '═'.repeat(w) + '╗\n' + C.reset;
      const bot = C.cyan + '╚' + '═'.repeat(w) + '╝' + C.reset;
      const pad = Math.max(0, w - text.length - 2);
      const left = Math.floor(pad / 2);
      const right = pad - left;
      const mid = C.cyan + '║' + C.reset + ' '.repeat(left) + C.bold + C.brightWhite + text + C.reset + ' '.repeat(right) + C.cyan + '║' + C.reset;
      return top + mid + '\n' + bot;
    });

    // ============ STEP ============
    bind('juice_step', (...a) => {
      const n = a[0] as number;
      const total = a.length > 1 ? a[1] as number : 0;
      const msg = a.length > 2 ? toStr(a[2]) : '';
      const pct = total > 0 ? ((n / total) * 100).toFixed(0) : '?';
      return C.dim + '[' + pct + '%]' + C.reset + ' ' + C.cyan + 'Step ' + n + (total > 0 ? '/' + total : '') + C.reset + ' ' + msg;
    });

    // ============ CLEAR / SCREEN ============
    bind('juice_clear', () => '\x1b[2J\x1b[H');
    bind('juice_clear_line', () => '\r\x1b[K');

    // v3.2.9 — extended box + log helpers
    bind('juice_box_list', (...a) => {
      const items = a[0] as BList;
      if (!items || items.__type !== 'list') return '';
      const lines = items.items.map(v => toStr(v));
      const w = Math.max(...lines.map(l => l.length), 0) + 4;
      const top = '┌' + '─'.repeat(w) + '┐';
      const bot = '└' + '─'.repeat(w) + '┘';
      const mid = lines.map(l => '│ ' + l + ' '.repeat(Math.max(0, w - 2 - l.length)) + ' │').join('\n');
      return top + '\n' + mid + '\n' + bot;
    });
    bind('juice_kv_table', (...a) => {
      const pairs = a[0] as BList;
      if (!pairs || pairs.__type !== 'list') return '';
      const rows: [string, string][] = pairs.items.map(item => {
        if (typeof item === 'object' && item !== null && '__type' in item && item.__type === 'tuple') {
          return [toStr((item as any).items[0]), toStr((item as any).items[1])];
        }
        return ['?', toStr(item)];
      });
      const maxKey = Math.max(...rows.map(r => r[0].length), 4);
      const maxVal = Math.max(...rows.map(r => r[1].length), 4);
      const w = maxKey + maxVal + 7;
      const top = '┌' + '─'.repeat(w) + '┐';
      const bot = '└' + '─'.repeat(w) + '┘';
      const sep = '├' + '─'.repeat(w) + '┤';
      const hdr = '│ ' + C.bold + 'KEY'.padEnd(maxKey) + C.reset + ' │ ' + C.bold + 'VALUE'.padEnd(maxVal) + C.reset + ' │';
      const body = rows.map(r => '│ ' + C.cyan + r[0].padEnd(maxKey) + C.reset + ' │ ' + r[1].padEnd(maxVal) + ' │').join('\n');
      return [top, hdr, sep, body, bot].join('\n');
    });
    bind('juice_log', (...a) => {
      const label = a[0] !== null && a[0] !== undefined ? toStr(a[0]) : '';
      const value = a.length > 1 && a[1] !== null && a[1] !== undefined ? toStr(a[1]) : '';
      return C.dim + label + ':' + C.reset + ' ' + value;
    });

    // ============ MENU ============
    bind('juice_menu', (...a) => {
      const title = a[0] !== null ? toStr(a[0]) : 'Menu';
      const items = a.length > 1 && a[1] !== null && typeof a[1] === 'object' && '__type' in (a[1] as any) && (a[1] as any).__type === 'list' ? (a[1] as BList).items : [];
      let lines: string[] = [];
      lines.push(C.cyan + '┌─ ' + C.bold + title + C.reset + C.cyan + ' ─' + '─'.repeat(Math.max(0, 20 - title.length)) + '┐' + C.reset);
      for (let i = 0; i < items.length; i++) {
        lines.push(C.cyan + '│' + C.reset + ' ' + C.yellow + (i + 1) + '.' + C.reset + ' ' + toStr(items[i]).padEnd(22).substring(0, 22) + ' ' + C.cyan + '│' + C.reset);
      }
      lines.push(C.cyan + '└' + '─'.repeat(24) + '┘' + C.reset);
      return lines.join('\n');
    });

    // ============ BARS / CHARTS ============
    bind('juice_bar_chart', (...a) => {
      const labels = a[0] as BList;
      const values = a.length > 1 ? a[1] as BList : null;
      const maxLen = a.length > 2 ? a[2] as number : 30;
      const lItems = labels && labels.__type === 'list' ? labels.items : [];
      const vItems = values && values.__type === 'list' ? values.items : [];
      if (lItems.length === 0) return '';
      const maxVal = Math.max(...vItems.map(v => v as number), 1);
      const lines: string[] = [];
      for (let i = 0; i < lItems.length; i++) {
        const v = (vItems[i] as number) || 0;
        const barLen = Math.floor((v / maxVal) * maxLen);
        const bar = '█'.repeat(barLen) + C.brightBlack + '░'.repeat(maxLen - barLen) + C.reset;
        lines.push(toStr(lItems[i]).padEnd(12) + ' ' + C.green + bar + C.reset + ' ' + v);
      }
      return lines.join('\n');
    });

    // ============ TIME / CLOCK ============
    bind('juice_now', () => {
      const d = new Date();
      const pad = (x: number) => x.toString().padStart(2, '0');
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    });
    bind('juice_date', () => {
      const d = new Date();
      const pad = (x: number) => x.toString().padStart(2, '0');
      return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    });
    bind('juice_time', () => {
      const d = new Date();
      const pad = (x: number) => x.toString().padStart(2, '0');
      return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    });
  }
}
