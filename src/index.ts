#!/usr/bin/env node
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { Interpreter, BockieError } from './interpreter';
import { ParserError } from './parser';
import { LexerError } from './lexer';

const BANNER = String.raw`
  ____            _    _
 |  _ \          | |  | |
 | |_) | _____  _| | _| | _____ _ __
 |  _ < / _ \ \/ / |/ / |/ / _ \ '__|
 | |_) | (_) >  <|   <|   <  __/ |
 |____/ \___/_/\_\_|\_\_|\_\___|_|

   v2.0.0  -  Created by xobe
   Type "exit()" or press Ctrl+C to quit.
`;

function showHelp() { console.log(`
Bockie Programming Language v2.0.0
Created by xobe

Usage:
  bockie                       Start interactive REPL
  bockie <file.bckie>          Run a Bockie script file
  bockie run <file.bckie>      Run a Bockie script file (alternative)
  bockie -e "code"             Evaluate inline code
  bockie --help                 Show this help message
  bockie --version              Show version
  bockie --examples             Show example programs
  bockie --modules              Show available modules

Examples:
  bockie hello.bckie
  bockie -e "print('Hi!')"

Modules: game, fs, os, regex, datetime, process, crypto, http, json
`); }

function showVersion() { const p=require('../package.json'); console.log(`Bockie ${p.version}`); console.log(`Created by ${p.author}`); }
function showExamples() { const d=path.join(__dirname,'..','examples'); if (!fs.existsSync(d)) { console.log('No examples directory.'); return; } const files=fs.readdirSync(d).filter(f=>f.endsWith('.bckie')); console.log('Available examples ('+files.length+' total):\n'); for (const f of files) console.log('  '+f); console.log('\nRun with: bockie run examples/<file>'); }
function showModules() { console.log(`
Bockie built-in modules:
  game       2D game engine (ASCII + HTML5 canvas)
  fs         File system operations
  os         OS info (name, arch, env vars, cpus, memory)
  regex      Regular expressions (match, find, replace, split)
  datetime   Date/time functions
  process    Subprocess & shell (shell, shell_silent, kill)
  crypto     Hashing (md5, sha256, sha512, base64, uuid, hmac)
  http       HTTP client (get, post, url_encode)
  json       JSON encode/decode

Usage:
  import game
  import fs
  data = fs_read("file.txt")
  hash = sha256("hello")
`); }

function runFile(fp: string) { if (!fs.existsSync(fp)) { console.error(`Error: File not found: ${fp}`); process.exit(1); } const src=fs.readFileSync(fp,'utf-8'); const cwd=path.dirname(path.resolve(fp)); try { new Interpreter({ cwd }).run(src); } catch (e:any) { if (e instanceof LexerError || e instanceof ParserError || e instanceof BockieError) console.error(e.message); else console.error('Error:', e.message); process.exit(1); } }
function runInline(code: string) {
  const processed = code.replace(/\\n/g, '\n').replace(/\\t/g, '\t');
  try { new Interpreter().run(processed); } catch (e:any) { if (e instanceof LexerError || e instanceof ParserError || e instanceof BockieError) console.error(e.message); else console.error('Error:', e.message); process.exit(1); } }
function repl() {
  console.log(BANNER);
  const rl=readline.createInterface({ input:process.stdin, output:process.stdout, prompt:'bockie> ' });
  const interp=new Interpreter(); let buf=''; let ml=false;
  rl.prompt();
  rl.on('line', (line:string) => {
    try {
      if (line.endsWith(':') || ml) { buf+=line+'\n'; ml=true; if (line.trim()==='' || (ml && !line.startsWith(' ') && !line.startsWith('\t'))) ml=false; if (ml) { rl.setPrompt('... '); return; } } else buf+=line;
      if (buf.trim()==='') { buf=''; rl.setPrompt('bockie> '); return; }
      if (buf.trim()==='exit()' || buf.trim()==='quit()') { console.log('Goodbye!'); process.exit(0); }
      try { interp.run(buf); } catch (e:any) { console.error(e.message); }
      buf=''; rl.setPrompt('bockie> ');
    } finally {}
    rl.prompt();
  }).on('close', () => { console.log('\nGoodbye!'); process.exit(0); });
}

function main() {
  const args=process.argv.slice(2);
  if (args.length===0) { repl(); return; }
  const cmd=args[0];
  if (cmd==='--help'||cmd==='-h') { showHelp(); return; }
  if (cmd==='--version'||cmd==='-v') { showVersion(); return; }
  if (cmd==='--examples') { showExamples(); return; }
  if (cmd==='--modules') { showModules(); return; }
  if (cmd==='run') { if (args.length<2) { console.error('Usage: bockie run <file.bckie>'); process.exit(1); } runFile(args[1]); return; }
  if (cmd==='-e'||cmd==='--eval') { if (args.length<2) { console.error('Usage: bockie -e "code"'); process.exit(1); } runInline(args[1]); return; }
  if (cmd.endsWith('.bckie') || fs.existsSync(cmd)) { runFile(cmd); return; }
  console.error(`Unknown command: ${cmd}`); console.error('Run "bockie --help" for usage.'); process.exit(1);
}
main();
