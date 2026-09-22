// Created by xobe

export enum TokenType {
  NUMBER, STRING, TRUE, FALSE, NONE,
  IDENT, KEYWORD,
  PLUS, MINUS, MULTIPLY, DIVIDE, FLOOR_DIV, MODULO, POWER,
  AMP, PIPE, CARET, TILDE, LSHIFT, RSHIFT,
  ASSIGN, AUG_ASSIGN, EQ, NEQ, LT, GT, LTE, GTE,
  AND, OR, NOT, PIPELINE, NULL_COALESCE, SPREAD, ARROW, WALRUS,
  IS, ASSERT,
  LPAREN, RPAREN, LBRACKET, RBRACKET, LBRACE, RBRACE,
  COMMA, COLON, SEMICOLON, DOT, NEWLINE,
  INDENT, DEDENT, EOF,
}

const KEYWORDS = new Set([
  'def','return','if','elif','else','while','for','in','break','continue','pass',
  'and','or','not','True','False','None','true','false','null','none',
  'import','as','lambda','is','try','except','finally','raise','with','global',
  'nonlocal','class','assert','del','from','match','case','repeat','times',
  'unless','until','when','default',
]);

export interface Token { type: TokenType; value: string; line: number; col: number; }

export class LexerError extends Error {
  constructor(message: string, line: number, col: number) { super(`Lexer Error [line ${line}, col ${col}]: ${message}`); }
}

export class Lexer {
  private source: string;
  private pos = 0;
  private line = 1;
  private col = 1;
  private tokens: Token[] = [];

  constructor(source: string) { this.source = source; }

  tokenize(): Token[] {
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos];
      if (ch === ' ' || ch === '\t') { this.pos++; this.col++; continue; }
      if (ch === '#') { while (this.pos < this.source.length && this.source[this.pos] !== '\n') { this.pos++; this.col++; } continue; }
      if (ch === '\n') { this.tokens.push({type: TokenType.NEWLINE, value:'\\n', line: this.line, col: this.col}); this.pos++; this.line++; this.col = 1; continue; }
      if (ch === '\r') { this.pos++; this.col++; continue; }
      if (this.isDigit(ch)) { this.readNumber(); continue; }
      if (ch === '"' || ch === "'") { this.readString(ch); continue; }
      if (this.isAlpha(ch) || ch === '_') { this.readIdentifier(); continue; }
      this.readOperator();
    }
    this.tokens.push({type: TokenType.EOF, value:'', line: this.line, col: this.col});
    return this.tokens;
  }

  private isDigit(c: string) { return c >= '0' && c <= '9'; }
  private isAlpha(c: string) { return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'); }
  private isAlphaNum(c: string) { return this.isAlpha(c) || this.isDigit(c) || c === '_'; }

  private readNumber() {
    const startCol = this.col;
    let num = '';
    while (this.pos < this.source.length && (this.isDigit(this.source[this.pos]) || this.source[this.pos] === '.')) { num += this.source[this.pos]; this.pos++; this.col++; }
    this.tokens.push({type: TokenType.NUMBER, value: num, line: this.line, col: startCol});
  }

  // v3.3.3 #4 — heuristic: detect dict-style {"key": value} pattern.
  private looksLikeDictEntry(pos: number): boolean {
    const q = this.source[pos];
    if (q !== '"' && q !== "'") return false;
    let p = pos + 1;
    while (p < this.source.length && this.source[p] !== q) p++;
    if (p >= this.source.length) return false;
    p++;
    while (p < this.source.length && (this.source[p] === ' ' || this.source[p] === '\t')) p++;
    return p < this.source.length && this.source[p] === ':';
  }

  private readString(quote: string) {
    const startCol = this.col;
    if (this.source[this.pos+1] === quote && this.source[this.pos+2] === quote) {
      this.pos += 3; this.col += 3;
      let str = '';
      while (this.pos < this.source.length) {
        if (this.source[this.pos] === quote && this.source[this.pos+1] === quote && this.source[this.pos+2] === quote) { this.pos += 3; this.col += 3; this.tokens.push({type: TokenType.STRING, value: str, line: this.line, col: startCol}); return; }
        if (this.source[this.pos] === '\\') { this.pos++; this.col++; const esc = this.source[this.pos]; str += ({'n':'\n','t':'\t','r':'\r','\\':'\\',"'":"'",'"':'"','0':'\0'})[esc] !== undefined ? ({'n':'\n','t':'\t','r':'\r','\\':'\\','\'':'\'','"':'"','0':'\0'})[esc] : ('\\' + esc); this.pos++; this.col++; }
        else if (this.source[this.pos] === '\n') { str += '\n'; this.pos++; this.line++; this.col = 1; }
        else { str += this.source[this.pos]; this.pos++; this.col++; }
      }
      throw new LexerError('Unterminated triple-quoted string', this.line, startCol);
    }
    this.pos++; this.col++;
    let str = '';
    let hasInterp = false;
    const parts: (string | { expr: string })[] = [];
    while (this.pos < this.source.length && this.source[this.pos] !== quote) {
      if (this.source[this.pos] === '\\') {
        this.pos++; this.col++;
        const esc = this.source[this.pos];
        // v3.3.3 #4+#19 — \{ and \} produce literal { and } (escape from interpolation)
        if (esc === '{') { str += '{'; this.pos++; this.col++; continue; }
        if (esc === '}') { str += '}'; this.pos++; this.col++; continue; }
        str += ({'n':'\n','t':'\t','r':'\r','\\':'\\',"'":"'",'"':'"','0':'\0'})[esc] !== undefined ? ({'n':'\n','t':'\t','r':'\r','\\':'\\','\'':'\'','"':'"','0':'\0'})[esc] : ('\\' + esc);
        this.pos++; this.col++;
      }
      else if (this.source[this.pos] === '{') {
        if (this.source[this.pos+1] === '{') { str += '{'; this.pos += 2; this.col += 2; }
        // v3.3.3 #4 — Heuristic: only open interpolation if { is followed by something
        // that could start an expression (identifier, number, paren, etc.).
        // If followed by " or ' (string literal starting the expression), still interpolate
        // (this allows ternary-in-fstring). But if followed by another string char that
        // looks like dict-style "key":, treat { as literal to preserve JSON/dict compat.
        // Simpler rule: if the { is at the start of a line or preceded by whitespace,
        // and followed by `"` or `'`, AND the next non-string token is `:`, treat as literal.
        // Even simpler: always interpolate unless preceded by another { (already handled).
        // But this breaks JSON strings. Solution: only interpolate when followed by
        // non-quote, non-} chars OR explicit ( ) [ ] identifier digit.
        else {
          const nextCh = this.source[this.pos+1];
          // Don't interpolate if next is } (empty interp — treat as literal)
          // Don't interpolate if next is " or ' AND it looks like a dict literal
          // (heuristic: next char is quote, and after the closing quote there's a :)
          if (nextCh === '}') {
            // {} → literal { and }
            str += '{}'; this.pos += 2; this.col += 2; continue;
          }
          if ((nextCh === '"' || nextCh === "'") && this.looksLikeDictEntry(this.pos+1)) {
            // Looks like {"key": value} → treat { as literal
            str += '{'; this.pos++; this.col++; continue;
          }
          if (str) { parts.push(str); str = ''; }
          hasInterp = true;
          let depth = 1; this.pos++; this.col++; let expr = '';
          while (this.pos < this.source.length && depth > 0) { const c = this.source[this.pos]; if (c === '{') depth++; if (c === '}') { depth--; if (depth === 0) break; } expr += c; this.pos++; this.col++; }
          if (this.source[this.pos] !== '}') throw new LexerError('Unterminated interpolation', this.line, startCol);
          this.pos++; this.col++;
          parts.push({ expr });
        }
      } else if (this.source[this.pos] === '}' && this.source[this.pos+1] === '}') {
        str += '}'; this.pos += 2; this.col += 2;
      } else { str += this.source[this.pos]; this.pos++; this.col++; }
    }
    if (this.pos >= this.source.length) throw new LexerError(`Unterminated string`, this.line, startCol);
    this.pos++; this.col++;
    if (hasInterp) { if (str) parts.push(str); this.tokens.push({type: TokenType.STRING, value: '__interp__' + JSON.stringify(parts), line: this.line, col: startCol}); }
    else this.tokens.push({type: TokenType.STRING, value: str, line: this.line, col: startCol});
  }

  private readIdentifier() {
    const startCol = this.col;
    let ident = '';
    while (this.pos < this.source.length && this.isAlphaNum(this.source[this.pos])) { ident += this.source[this.pos]; this.pos++; this.col++; }
    if (KEYWORDS.has(ident)) {
      if (ident === 'True' || ident === 'true') this.tokens.push({type: TokenType.TRUE, value: ident, line: this.line, col: startCol});
      else if (ident === 'False' || ident === 'false') this.tokens.push({type: TokenType.FALSE, value: ident, line: this.line, col: startCol});
      else if (ident === 'None' || ident === 'null' || ident === 'none') this.tokens.push({type: TokenType.NONE, value: ident, line: this.line, col: startCol});
      else this.tokens.push({type: TokenType.KEYWORD, value: ident, line: this.line, col: startCol});
    } else this.tokens.push({type: TokenType.IDENT, value: ident, line: this.line, col: startCol});
  }

  private readOperator() {
    const ch = this.source[this.pos];
    const next = this.source[this.pos + 1];
    const next2 = this.source[this.pos + 2];
    const startCol = this.col;
    if (ch === '.' && next === '.' && next2 === '.') { this.tokens.push({type: TokenType.SPREAD, value:'...', line:this.line, col:startCol}); this.pos+=3; this.col+=3; return; }
    if (ch === '|' && next === '>') { this.tokens.push({type: TokenType.PIPELINE, value:'|>', line:this.line, col:startCol}); this.pos+=2; this.col+=2; return; }
    if (ch === '?' && next === '?') { this.tokens.push({type: TokenType.NULL_COALESCE, value:'??', line:this.line, col:startCol}); this.pos+=2; this.col+=2; return; }
    if (ch === '*' && next === '*') { this.tokens.push({type: TokenType.POWER, value:'**', line:this.line, col:startCol}); this.pos+=2; this.col+=2; return; }
    if (ch === '-' && next === '>') { this.tokens.push({type: TokenType.ARROW, value:'->', line:this.line, col:startCol}); this.pos+=2; this.col+=2; return; }
    if (ch === ':' && next === '=') { this.tokens.push({type: TokenType.WALRUS, value:':=', line:this.line, col:startCol}); this.pos+=2; this.col+=2; return; }
    const single: Record<string, TokenType> = { '(': TokenType.LPAREN, ')': TokenType.RPAREN, '[': TokenType.LBRACKET, ']': TokenType.RBRACKET, '{': TokenType.LBRACE, '}': TokenType.RBRACE, ',': TokenType.COMMA, ':': TokenType.COLON, ';': TokenType.SEMICOLON, '.': TokenType.DOT };
    if (single[ch]) { this.tokens.push({type: single[ch], value:ch, line:this.line, col:startCol}); this.pos++; this.col++; return; }
    if (ch === '=') { if (next === '=') { this.tokens.push({type: TokenType.EQ, value:'==', line:this.line, col:startCol}); this.pos+=2; this.col+=2; } else { this.tokens.push({type: TokenType.ASSIGN, value:'=', line:this.line, col:startCol}); this.pos++; this.col++; } return; }
    if (ch === '!' && next === '=') { this.tokens.push({type: TokenType.NEQ, value:'!=', line:this.line, col:startCol}); this.pos+=2; this.col+=2; return; }
    if (['+','-','*','/','%'].includes(ch)) {
      // v3.3.2 — // (floor division) operator
      if (ch === '/' && next === '/') {
        this.tokens.push({type: TokenType.FLOOR_DIV, value:'//', line:this.line, col:startCol});
        this.pos+=2; this.col+=2; return;
      }
      if (next === '=') { this.tokens.push({type: TokenType.AUG_ASSIGN, value:ch+'=', line:this.line, col:startCol}); this.pos+=2; this.col+=2; }
      else { const t = {'+':TokenType.PLUS,'-':TokenType.MINUS,'*':TokenType.MULTIPLY,'/':TokenType.DIVIDE,'%':TokenType.MODULO}[ch]; this.tokens.push({type: t, value:ch, line:this.line, col:startCol}); this.pos++; this.col++; }
      return;
    }
    if (ch === '<') {
      if (next === '=') { this.tokens.push({type: TokenType.LTE, value:'<=', line:this.line, col:startCol}); this.pos+=2; this.col+=2; return; }
      if (next === '<') { this.tokens.push({type: TokenType.LSHIFT, value:'<<', line:this.line, col:startCol}); this.pos+=2; this.col+=2; return; }
      this.tokens.push({type: TokenType.LT, value:'<', line:this.line, col:startCol}); this.pos++; this.col++; return;
    }
    if (ch === '>') {
      if (next === '=') { this.tokens.push({type: TokenType.GTE, value:'>=', line:this.line, col:startCol}); this.pos+=2; this.col+=2; return; }
      if (next === '>') { this.tokens.push({type: TokenType.RSHIFT, value:'>>', line:this.line, col:startCol}); this.pos+=2; this.col+=2; return; }
      this.tokens.push({type: TokenType.GT, value:'>', line:this.line, col:startCol}); this.pos++; this.col++; return;
    }
    // v3.3.3 #16+#17 — bitwise operators & | ^ ~
    if (ch === '&') { this.tokens.push({type: TokenType.AMP, value:'&', line:this.line, col:startCol}); this.pos++; this.col++; return; }
    if (ch === '|') {
      if (next === '|') { this.tokens.push({type: TokenType.OR, value:'||', line:this.line, col:startCol}); this.pos+=2; this.col+=2; return; }
      this.tokens.push({type: TokenType.PIPE, value:'|', line:this.line, col:startCol}); this.pos++; this.col++; return;
    }
    if (ch === '^') { this.tokens.push({type: TokenType.CARET, value:'^', line:this.line, col:startCol}); this.pos++; this.col++; return; }
    if (ch === '~') { this.tokens.push({type: TokenType.TILDE, value:'~', line:this.line, col:startCol}); this.pos++; this.col++; return; }
    throw new LexerError(`Unexpected character '${ch}'`, this.line, startCol);
  }
}
