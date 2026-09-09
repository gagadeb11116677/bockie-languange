import { Environment, Interpreter, BValue, BBuiltin } from './interpreter';

const ANSI = { reset:'\x1b[0m', clear:'\x1b[2J\x1b[H', hide:'\x1b[?25l', show:'\x1b[?25h', fg:(c:number)=>`\x1b[38;5;${c}m`, cursor:(x:number,y:number)=>`\x1b[${y+1};${x+1}H` };
interface Screen { width:number; height:number; buffer:string[][]; colors:(number|null)[][]; }
interface CanvasState { width:number; height:number; commands:any[]; title:string; bgColor:string; }
const screens:Map<number,Screen>=new Map(); let nsid=1;
const canvases:Map<number,CanvasState>=new Map(); let ncid=1;

export class GameModule {
  static populate(env:Environment, interp:Interpreter) {
    const define=(name:string, fn:(...a:BValue[])=>BValue)=>{ env.define(name, { __type:'builtin', name, fn } as BBuiltin); };
    define('screen_create', (...a) => { const id=nsid++; screens.set(id, { width:a[0] as number, height:a[1] as number, buffer:Array.from({length:a[1] as number},()=>Array(a[0] as number).fill(' ')), colors:Array.from({length:a[1] as number},()=>Array(a[0] as number).fill(null)) }); return id; });
    define('screen_clear', (...a) => { const s=screens.get(a[0] as number); if (!s) return null; for (let y=0;y<s.height;y++) for (let x=0;x<s.width;x++) { s.buffer[y][x]=' '; s.colors[y][x]=null; } return null; });
    define('screen_set', (...a) => { const s=screens.get(a[0] as number); if (!s) return null; const x=Math.floor(a[1] as number); const y=Math.floor(a[2] as number); if (x<0||x>=s.width||y<0||y>=s.height) return null; s.buffer[y][x]=(a[3] as string)||' '; s.colors[y][x]=a.length>4?(a[4] as number):null; return null; });
    define('screen_get', (...a) => { const s=screens.get(a[0] as number); if (!s) return ' '; const x=Math.floor(a[1] as number); const y=Math.floor(a[2] as number); if (x<0||x>=s.width||y<0||y>=s.height) return ' '; return s.buffer[y][x]; });
    define('screen_render', (...a) => { const s=screens.get(a[0] as number); if (!s) return null; let out=ANSI.clear; for (let y=0;y<s.height;y++) { for (let x=0;x<s.width;x++) { const c=s.buffer[y][x]; const col=s.colors[y][x]; out+=col!==null?ANSI.fg(col)+c+ANSI.reset:c; } out+='\n'; } process.stdout.write(out); return null; });
    define('screen_width', (...a) => screens.get(a[0] as number)?.width||0);
    define('screen_height', (...a) => screens.get(a[0] as number)?.height||0);
    define('screen_draw_text', (...a) => { const s=screens.get(a[0] as number); if (!s) return null; const x=Math.floor(a[1] as number); const y=Math.floor(a[2] as number); const t=a[3] as string; const c=a.length>4?(a[4] as number):null; for (let i=0;i<t.length;i++) if (x+i<s.width && y<s.height && y>=0) { s.buffer[y][x+i]=t[i]; s.colors[y][x+i]=c; } return null; });
    define('screen_draw_rect', (...a) => { const s=screens.get(a[0] as number); if (!s) return null; const x=Math.floor(a[1] as number); const y=Math.floor(a[2] as number); const w=Math.floor(a[3] as number); const h=Math.floor(a[4] as number); const ch=(a[5] as string)||'#'; const c=a.length>6?(a[6] as number):null; for (let dy=0;dy<h;dy++) for (let dx=0;dx<w;dx++) { const px=x+dx, py=y+dy; if (px>=0&&px<s.width&&py>=0&&py<s.height) { s.buffer[py][px]=ch; s.colors[py][px]=c; } } return null; });
    define('screen_draw_line', (...a) => { const s=screens.get(a[0] as number); if (!s) return null; const x0=Math.floor(a[1] as number); const y0=Math.floor(a[2] as number); const x1=Math.floor(a[3] as number); const y1=Math.floor(a[4] as number); const ch=(a[5] as string)||'*'; const c=a.length>6?(a[6] as number):null; let dx=Math.abs(x1-x0), dy=Math.abs(y1-y0); const sx=x0<x1?1:-1, sy=y0<y1?1:-1; let err=dx-dy, cx=x0, cy=y0; while (true) { if (cx>=0&&cx<s.width&&cy>=0&&cy<s.height) { s.buffer[cy][cx]=ch; s.colors[cy][cx]=c; } if (cx===x1&&cy===y1) break; const e2=2*err; if (e2>-dy) { err-=dy; cx+=sx; } if (e2<dx) { err+=dx; cy+=sy; } } return null; });
    define('screen_draw_circle', (...a) => { const s=screens.get(a[0] as number); if (!s) return null; const cx=a[1] as number; const cy=a[2] as number; const r=a[3] as number; const ch=(a[4] as string)||'*'; const c=a.length>5?(a[5] as number):null; for (let angle=0;angle<360;angle+=1) { const rad=angle*Math.PI/180; const x=Math.floor(cx+r*Math.cos(rad)); const y=Math.floor(cy+r*Math.sin(rad)); if (x>=0&&x<s.width&&y>=0&&y<s.height) { s.buffer[y][x]=ch; s.colors[y][x]=c; } } return null; });

    define('canvas_create', (...a) => { const id=ncid++; canvases.set(id, { width:a[0] as number, height:a[1] as number, commands:[], title:'Bockie Game', bgColor:'#0a0a0a' }); return id; });
    define('canvas_title', (...a) => { const c=canvases.get(a[0] as number); if (c) c.title=a[1] as string; return null; });
    define('canvas_bg', (...a) => { const c=canvases.get(a[0] as number); if (c) c.bgColor=a[1] as string; return null; });
    define('canvas_clear', (...a) => { const c=canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op:'clear', color:a.length>1?(a[1] as string):c.bgColor }); return null; });
    define('canvas_rect', (...a) => { const c=canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op:'rect', x:a[1], y:a[2], w:a[3], h:a[4], color:a[5], fill:a.length>6?(a[6] as boolean):true }); return null; });
    define('canvas_circle', (...a) => { const c=canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op:'circle', x:a[1], y:a[2], r:a[3], color:a[4], fill:a.length>5?(a[5] as boolean):true }); return null; });
    define('canvas_line', (...a) => { const c=canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op:'line', x1:a[1], y1:a[2], x2:a[3], y2:a[4], color:a[5], width:a.length>6?(a[6] as number):1 }); return null; });
    define('canvas_text', (...a) => { const c=canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op:'text', x:a[1], y:a[2], text:a[3], color:a[4], size:a.length>5?(a[5] as number):16 }); return null; });
    define('canvas_pixel', (...a) => { const c=canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op:'pixel', x:a[1], y:a[2], color:a[3] }); return null; });
    define('canvas_ellipse', (...a) => { const c=canvases.get(a[0] as number); if (!c) return null; c.commands.push({ op:'ellipse', x:a[1], y:a[2], rx:a[3], ry:a[4], color:a[5], fill:a.length>6?(a[6] as boolean):true }); return null; });
    define('canvas_width', (...a) => canvases.get(a[0] as number)?.width||0);
    define('canvas_height', (...a) => canvases.get(a[0] as number)?.height||0);
    define('canvas_save_html', (...a) => { const c=canvases.get(a[0] as number); if (!c) return null; require('fs').writeFileSync(a[1] as string, this.generateHTML(c), 'utf-8'); return a[1] as string; });
    define('canvas_play', (...a) => { const c=canvases.get(a[0] as number); if (!c) return null; const fs=require('fs'), path=require('path'), os=require('os'); const tf=path.join(os.tmpdir(), `bockie_game_${Date.now()}.html`); fs.writeFileSync(tf, this.generateHTML(c), 'utf-8'); let cmd:string; if (process.platform==='win32') cmd=`start "" "${tf}"`; else if (process.platform==='darwin') cmd=`open "${tf}"`; else cmd=`xdg-open "${tf}"`; try { require('child_process').exec(cmd, ()=>{}); return tf; } catch (e) { return null; } });
    define('canvas_flush', (...a) => { const c=canvases.get(a[0] as number); if (c) c.commands=[]; return null; });

    define('term_clear', () => { process.stdout.write(ANSI.clear); return null; });
    define('term_hide_cursor', () => { process.stdout.write(ANSI.hide); return null; });
    define('term_show_cursor', () => { process.stdout.write(ANSI.show); return null; });
    define('term_set_cursor', (...a) => { process.stdout.write(ANSI.cursor(a[0] as number, a[1] as number)); return null; });
    define('term_color', (...a) => { process.stdout.write(ANSI.fg(a[0] as number)); return null; });
    define('term_reset_color', () => { process.stdout.write(ANSI.reset); return null; });
    define('term_set_raw', (...a) => { try { if (process.stdin.isTTY) process.stdin.setRawMode(a[0] as boolean); } catch (e) {} return null; });
    define('term_width', () => process.stdout.columns || 80);
    define('term_height', () => process.stdout.rows || 24);
    define('key_get', () => { try { const b=Buffer.alloc(1); const n=require('fs').readSync(0,b,0,1); return n===0?'':String.fromCharCode(b[0]); } catch (e) { return ''; } });
    define('key_wait', () => { try { const b=Buffer.alloc(3); const n=require('fs').readSync(0,b,0,3); if (n===0) return ''; if (n===3 && b[0]===0x1b && b[1]===0x5b) { switch (b[2]) { case 0x41: return 'up'; case 0x42: return 'down'; case 0x43: return 'right'; case 0x44: return 'left'; } } return String.fromCharCode(b[0]); } catch (e) { return ''; } });
    define('beep', () => { process.stdout.write('\x07'); return null; });
  }

  static generateHTML(c: CanvasState): string {
    const frameJSON = JSON.stringify(c.commands);
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>${this.escapeHTML(c.title)}</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{background:#0a0a0a;color:#e0e0e0;font-family:'Courier New',monospace;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px}h1{color:#ffaa00;margin-bottom:10px;font-size:1.5em}.canvas-wrap{border:2px solid #333;border-radius:6px;overflow:hidden;box-shadow:0 0 30px rgba(0,0,0,0.8)}canvas{display:block;background:${this.escapeHTML(c.bgColor)}}.footer{margin-top:20px;color:#555;font-size:0.85em;text-align:center}.footer a{color:#ffaa00;text-decoration:none}</style>
</head>
<body>
<h1>${this.escapeHTML(c.title)}</h1>
<div class="canvas-wrap"><canvas id="game" width="${c.width}" height="${c.height}"></canvas></div>
<div class="footer">Made with Bockie · Created by <strong>xobe</strong></div>
<script>
const canvas=document.getElementById('game');const ctx=canvas.getContext('2d');const frames=${frameJSON};
function drawFrame(commands){for(const cmd of commands){switch(cmd.op){
case 'clear':ctx.fillStyle=cmd.color;ctx.fillRect(0,0,canvas.width,canvas.height);break;
case 'rect':ctx.fillStyle=cmd.color;ctx.strokeStyle=cmd.color;if(cmd.fill)ctx.fillRect(cmd.x,cmd.y,cmd.w,cmd.h);else ctx.strokeRect(cmd.x,cmd.y,cmd.w,cmd.h);break;
case 'circle':ctx.fillStyle=cmd.color;ctx.strokeStyle=cmd.color;ctx.beginPath();ctx.arc(cmd.x,cmd.y,Math.max(0,cmd.r),0,2*Math.PI);if(cmd.fill)ctx.fill();else ctx.stroke();break;
case 'ellipse':ctx.fillStyle=cmd.color;ctx.strokeStyle=cmd.color;ctx.beginPath();ctx.ellipse(cmd.x,cmd.y,Math.max(0,cmd.rx),Math.max(0,cmd.ry),0,0,2*Math.PI);if(cmd.fill)ctx.fill();else ctx.stroke();break;
case 'line':ctx.strokeStyle=cmd.color;ctx.lineWidth=cmd.width;ctx.beginPath();ctx.moveTo(cmd.x1,cmd.y1);ctx.lineTo(cmd.x2,cmd.y2);ctx.stroke();break;
case 'text':ctx.fillStyle=cmd.color;ctx.font=cmd.size+'px monospace';ctx.textBaseline='top';ctx.fillText(cmd.text,cmd.x,cmd.y);break;
case 'pixel':ctx.fillStyle=cmd.color;ctx.fillRect(cmd.x,cmd.y,1,1);break;
}}}
drawFrame(frames);
window.addEventListener('message',e=>{if(e.data&&e.data.type==='render')drawFrame(e.data.commands);});
</script>
</body>
</html>`;
  }

  static escapeHTML(s: string): string { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
}
