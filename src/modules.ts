import { Environment, Interpreter, BValue, BList, BDict, BBuiltin, BockieError } from './interpreter';

export class StdModules {
  static populate(env: Environment, interp: Interpreter) {
    const fs = require('fs'); const path = require('path'); const os = require('os');
    const { execSync, spawnSync } = require('child_process'); const crypto = require('crypto');
    const bind = (name: string, fn: (...args: BValue[]) => BValue) => { env.define(name, { __type: 'builtin', name, fn } as BBuiltin); };

    bind('fs_read', (...a) => { try { return fs.readFileSync(interp.resolvePath(a[0] as string), 'utf-8'); } catch (e:any) { throw new BockieError(`cannot read: ${e.message}`); } });
    bind('fs_write', (...a) => { try { fs.writeFileSync(interp.resolvePath(a[0] as string), a[1] as string); return null; } catch (e:any) { throw new BockieError(`cannot write: ${e.message}`); } });
    bind('fs_append', (...a) => { try { fs.appendFileSync(interp.resolvePath(a[0] as string), a[1] as string); return null; } catch (e:any) { throw new BockieError(`cannot append: ${e.message}`); } });
    bind('fs_exists', (...a) => { try { return fs.existsSync(interp.resolvePath(a[0] as string)); } catch (e) { return false; } });
    bind('fs_mkdir', (...a) => { try { fs.mkdirSync(interp.resolvePath(a[0] as string), { recursive: true }); return null; } catch (e:any) { throw new BockieError(`mkdir failed: ${e.message}`); } });
    bind('fs_rmdir', (...a) => { try { fs.rmSync(interp.resolvePath(a[0] as string), { recursive: true, force: true }); return null; } catch (e:any) { throw new BockieError(`rmdir failed: ${e.message}`); } });
    bind('fs_remove', (...a) => { try { fs.unlinkSync(interp.resolvePath(a[0] as string)); return null; } catch (e:any) { throw new BockieError(`remove failed: ${e.message}`); } });
    bind('fs_list', (...args) => { const p=interp.resolvePath(args[0] as string); try { const e=fs.readdirSync(p, { withFileTypes: true }); return { __type:'list', items: e.map((x:any)=>({ __type:'dict', entries:new Map([['name',x.name],['is_dir',x.isDirectory()],['is_file',x.isFile()],['size',x.isFile()?fs.statSync(path.join(p,x.name)).size:0]]) }) as BDict) } as BList; } catch (e:any) { throw new BockieError(`listdir failed: ${e.message}`); } });
    bind('fs_copy', (...a) => { try { fs.copyFileSync(interp.resolvePath(a[0] as string), interp.resolvePath(a[1] as string)); return null; } catch (e:any) { throw new BockieError(`copy failed: ${e.message}`); } });
    bind('fs_move', (...a) => { try { fs.renameSync(interp.resolvePath(a[0] as string), interp.resolvePath(a[1] as string)); return null; } catch (e:any) { throw new BockieError(`move failed: ${e.message}`); } });
    bind('fs_stat', (...a) => { try { const s=fs.statSync(interp.resolvePath(a[0] as string)); return { __type:'dict', entries:new Map([['size',s.size],['is_dir',s.isDirectory()],['is_file',s.isFile()],['mtime',s.mtimeMs/1000],['ctime',s.ctimeMs/1000]]) } as BDict; } catch (e:any) { throw new BockieError(`stat failed: ${e.message}`); } });
    bind('fs_pwd', () => process.cwd());
    bind('fs_chdir', (...a) => { try { process.chdir(interp.resolvePath(a[0] as string)); return null; } catch (e:any) { throw new BockieError(`chdir failed: ${e.message}`); } });
    bind('fs_join', (...a) => path.join(...a.map(x=>x as string)));
    bind('fs_ext', (...a) => path.extname(a[0] as string));
    bind('fs_basename', (...a) => path.basename(a[0] as string));
    bind('fs_dirname', (...a) => path.dirname(a[0] as string));
    bind('fs_absolute', (...a) => path.resolve(interp.resolvePath(a[0] as string)));
    bind('fs_read_lines', (...a) => { const c=fs.readFileSync(interp.resolvePath(a[0] as string), 'utf-8'); return { __type:'list', items:c.split(/\r?\n/).filter((l:string)=>l!=='') } as BList; });
    bind('fs_write_lines', (...a) => { const l=(a[1] as BList).items.map(i=>interp.toDisplay(i)).join('\n')+'\n'; fs.writeFileSync(interp.resolvePath(a[0] as string), l); return null; });
    bind('fs_read_csv', (...a) => { const c=fs.readFileSync(interp.resolvePath(a[0] as string), 'utf-8'); const d=a.length>1?(a[1] as string):','; return { __type:'list', items:c.split(/\r?\n/).filter((l:string)=>l!=='').map(l=>({ __type:'list', items:l.split(d) as BValue[] } as BList)) } as BList; });

    bind('os_name', () => process.platform);
    bind('os_arch', () => process.arch);
    bind('os_home', () => os.homedir());
    bind('os_tmpdir', () => os.tmpdir());
    bind('os_hostname', () => os.hostname());
    bind('os_platform', () => os.platform());
    bind('os_release', () => os.release());
    bind('os_type', () => os.type());
    bind('os_cpus', () => ({ __type:'list', items:os.cpus().map((c:any)=>({ __type:'dict', entries:new Map([['model',c.model],['speed',c.speed]]) })) } as BList));
    bind('os_cpu_count', () => os.cpus().length);
    bind('os_totalmem', () => os.totalmem());
    bind('os_freemem', () => os.freemem());
    bind('os_uptime', () => os.uptime());
    bind('os_env', (...args) => { if (args.length===0) { const d:BDict={__type:'dict',entries:new Map()}; for (const [k,v] of Object.entries(process.env)) d.entries.set(k, v ?? ''); return d; } return process.env[args[0] as string] ?? null; });
    bind('os_setenv', (...a) => { process.env[a[0] as string]=a[1] as string; return null; });
    bind('os_argv', () => ({ __type:'list', items:process.argv.slice(2).map(a=>a as BValue) } as BList));
    bind('os_cwd', () => process.cwd());
    bind('os_pid', () => process.pid);
    bind('os_sep', () => path.sep);
    bind('os_eol', () => os.EOL);

    bind('regex_match', (...a) => new RegExp(a[0] as string, a.length>2?(a[2] as string):'').test(a[1] as string));
    bind('regex_find', (...a) => { const m=(a[1] as string).match(new RegExp(a[0] as string, a.length>2?(a[2] as string):'')); return m?{__type:'list',items:Array.from(m) as BValue[]} as BList:null; });
    bind('regex_find_all', (...a) => { const f=(a.length>2?(a[2] as string):'')+'g'; const m=(a[1] as string).match(new RegExp(a[0] as string, f)) || []; return {__type:'list',items:m as BValue[]} as BList; });
    bind('regex_replace', (...a) => { const f=(a.length>3?(a[3] as string):'')+'g'; return (a[2] as string).replace(new RegExp(a[0] as string, f), a[1] as string); });
    bind('regex_split', (...a) => ({__type:'list',items:(a[1] as string).split(new RegExp(a[0] as string, a.length>2?(a[2] as string):'')) as BValue[]} as BList));
    bind('regex_groups', (...a) => { const m=new RegExp(a[0] as string, a.length>2?(a[2] as string):'').exec(a[1] as string); return m?{__type:'list',items:Array.from(m).slice(1) as BValue[]} as BList:null; });

    bind('now', () => Date.now()/1000);
    bind('now_ms', () => Date.now());
    bind('date_year', (...a) => new Date(a.length>0?(a[0] as number)*1000:Date.now()).getFullYear());
    bind('date_month', (...a) => new Date(a.length>0?(a[0] as number)*1000:Date.now()).getMonth()+1);
    bind('date_day', (...a) => new Date(a.length>0?(a[0] as number)*1000:Date.now()).getDate());
    bind('date_hour', (...a) => new Date(a.length>0?(a[0] as number)*1000:Date.now()).getHours());
    bind('date_minute', (...a) => new Date(a.length>0?(a[0] as number)*1000:Date.now()).getMinutes());
    bind('date_second', (...a) => new Date(a.length>0?(a[0] as number)*1000:Date.now()).getSeconds());
    bind('date_weekday', (...a) => new Date(a.length>0?(a[0] as number)*1000:Date.now()).getDay());
    bind('date_format', (...args) => { const t=args.length>1?(args[0] as number)*1000:Date.now(); const fmt=args.length>1?(args[1] as string):(args[0] as string); const d=new Date(t); return fmt.replace(/YYYY/g,String(d.getFullYear())).replace(/YY/g,String(d.getFullYear()).slice(-2)).replace(/MM/g,String(d.getMonth()+1).padStart(2,'0')).replace(/DD/g,String(d.getDate()).padStart(2,'0')).replace(/HH/g,String(d.getHours()).padStart(2,'0')).replace(/mm/g,String(d.getMinutes()).padStart(2,'0')).replace(/SS/g,String(d.getSeconds()).padStart(2,'0')); });
    bind('date_parse', (...a) => { const t=Date.parse(a[0] as string); if (isNaN(t)) throw new BockieError(`invalid date: ${a[0]}`); return t/1000; });

    bind('shell', (...a) => { try { return execSync(a[0] as string, { encoding:'utf-8', timeout:60000, stdio:['pipe','pipe','pipe'] }); } catch (e:any) { throw new BockieError(`shell command failed: ${e.message}`); } });
    bind('shell_silent', (...a) => { try { const r=spawnSync(a[0] as string, { shell:true, encoding:'utf-8', timeout:60000 }); return { __type:'dict', entries:new Map([['exit_code',r.status ?? -1],['stdout',r.stdout||''],['stderr',r.stderr||''],['success',(r.status ?? -1)===0]]) } as BDict; } catch (e:any) { throw new BockieError(`shell failed: ${e.message}`); } });
    bind('process_kill', (...a) => { try { process.kill(a[0] as number); return true; } catch (e) { return false; } });
    bind('process_exit', (...a) => process.exit(a.length>0?(a[0] as number):0));
    bind('process_pid', () => process.pid);
    bind('process_args', () => ({ __type:'list', items:process.argv.slice(2).map(a=>a as BValue) } as BList));

    bind('md5', (...a) => crypto.createHash('md5').update(a[0] as string).digest('hex'));
    bind('sha1', (...a) => crypto.createHash('sha1').update(a[0] as string).digest('hex'));
    bind('sha256', (...a) => crypto.createHash('sha256').update(a[0] as string).digest('hex'));
    bind('sha512', (...a) => crypto.createHash('sha512').update(a[0] as string).digest('hex'));
    bind('base64_encode', (...a) => Buffer.from(a[0] as string, 'utf-8').toString('base64'));
    bind('base64_decode', (...a) => Buffer.from(a[0] as string, 'base64').toString('utf-8'));
    bind('url_encode', (...a) => encodeURIComponent(a[0] as string));
    bind('url_decode', (...a) => decodeURIComponent(a[0] as string));
    bind('uuid', () => crypto.randomUUID());
    bind('random_bytes', (...a) => crypto.randomBytes(a[0] as number).toString('hex'));
    bind('hmac_sha256', (...a) => crypto.createHmac('sha256', a[0] as string).update(a[1] as string).digest('hex'));

    bind('http_get', (...a) => { const u=a[0] as string; try { const s=`const h=require('${u.startsWith('https')?'https':'http'}');h.get(${JSON.stringify(u)},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>process.stdout.write(d));r.on('error',e=>{process.stderr.write(e.message);process.exit(1);})}).on('error',e=>{process.stderr.write(e.message);process.exit(1);})`; return execSync(`node -e ${JSON.stringify(s)}`, { encoding:'utf-8', timeout:30000 }); } catch (e:any) { throw new BockieError(`http_get failed: ${e.stderr||e.message}`); } });
    bind('http_post', (...a) => { const u=a[0] as string; const d=a.length>1?(a[1] as string):''; try { const s=`const h=require('${u.startsWith('https')?'https':'http'}');const u2=new URL(${JSON.stringify(u)});const opts={hostname:u2.hostname,port:u2.port||(u2.protocol==='https:'?443:80),path:u2.pathname+u2.search,method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(${JSON.stringify(d)})}};const req=h.request(opts,res=>{let d2='';res.on('data',c=>d2+=c);res.on('end',()=>process.stdout.write(d2));});req.on('error',e=>{process.stderr.write(e.message);process.exit(1);});req.write(${JSON.stringify(d)});req.end();`; return execSync(`node -e ${JSON.stringify(s)}`, { encoding:'utf-8', timeout:30000 }); } catch (e:any) { throw new BockieError(`http_post failed: ${e.stderr||e.message}`); } });

    bind('print_color', (...a) => { const c=a[0] as number; const t=a.slice(1).map(x=>interp.toDisplay(x)).join(' '); const codes:Record<number,string>={0:'\x1b[0m',1:'\x1b[31m',2:'\x1b[32m',3:'\x1b[33m',4:'\x1b[34m',5:'\x1b[35m',6:'\x1b[36m',7:'\x1b[37m'}; interp.output((codes[c]||'')+t+'\x1b[0m\n'); return null; });
    bind('print_err', (...a) => { process.stderr.write(a.map(x=>interp.toDisplay(x)).join(' ')+'\n'); return null; });
    bind('read_line', () => { const buf:Buffer[]=[]; const c=Buffer.alloc(1); while (true) { const n=fs.readSync(0,c,0,1); if (n===0) break; if (c[0]===0x0a||c[0]===0x0d) break; buf.push(Buffer.from(c)); } return Buffer.concat(buf).toString('utf-8'); });
    bind('ask', (...a) => { interp.output(a[0] as string+(a.length>1?` [${a[1]}]: `:': ')); const buf:Buffer[]=[]; const c=Buffer.alloc(1); while (true) { const n=fs.readSync(0,c,0,1); if (n===0) break; if (c[0]===0x0a||c[0]===0x0d) break; buf.push(Buffer.from(c)); } const ans=Buffer.concat(buf).toString('utf-8'); if (!ans && a.length>1) return a[1]; return ans; });
    bind('confirm', (...a) => { interp.output(a[0] as string+' (y/N): '); const buf:Buffer[]=[]; const c=Buffer.alloc(1); while (true) { const n=fs.readSync(0,c,0,1); if (n===0) break; if (c[0]===0x0a||c[0]===0x0d) break; buf.push(Buffer.from(c)); } const ans=Buffer.concat(buf).toString('utf-8').toLowerCase(); return ans==='y'||ans==='yes'; });
    bind('color_red', (...a) => `\x1b[31m${a[0]}\x1b[0m`);
    bind('color_green', (...a) => `\x1b[32m${a[0]}\x1b[0m`);
    bind('color_yellow', (...a) => `\x1b[33m${a[0]}\x1b[0m`);
    bind('color_blue', (...a) => `\x1b[34m${a[0]}\x1b[0m`);
    bind('color_cyan', (...a) => `\x1b[36m${a[0]}\x1b[0m`);
    bind('bold', (...a) => `\x1b[1m${a[0]}\x1b[0m`);
    bind('progress_bar', (...a) => { const cur=a[0] as number; const tot=a[1] as number; const w=a.length>2?(a[2] as number):30; const l=a.length>3?(a[3] as string):''; const pct=Math.floor((cur/tot)*100); const f=Math.floor((cur/tot)*w); interp.output(`\r${l} [${'█'.repeat(f)}${'░'.repeat(w-f)}] ${pct}%`); if (cur>=tot) interp.output('\n'); return null; });
  }
}
