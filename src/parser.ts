// Created by xobe

import { Token, TokenType, Lexer, LexerError } from './lexer';
import * as ast from './ast';

export class ParserError extends Error {
  constructor(message: string, line: number) { super(`Parser Error [line ${line}]: ${message}`); }
}

export class Parser {
  private tokens: Token[] = [];
  private pos = 0;

  parse(source: string): ast.ProgramNode {
    const lexer = new Lexer(source);
    this.tokens = this.processIndentation(lexer.tokenize());
    this.pos = 0;
    const body: ast.Node[] = [];
    while (!this.isAtEnd()) { while (this.check(TokenType.NEWLINE)) this.advance(); if (this.isAtEnd()) break; body.push(this.statement()); }
    return { type: 'Program', body };
  }

  private processIndentation(tokens: Token[]): Token[] {
    const result: Token[] = [];
    const indentStack: number[] = [0];
    let atLineStart = true;
    let parenDepth = 0;
    for (const tok of tokens) {
      if (tok.type === TokenType.LPAREN || tok.type === TokenType.LBRACKET || tok.type === TokenType.LBRACE) parenDepth++;
      if (tok.type === TokenType.RPAREN || tok.type === TokenType.RBRACKET || tok.type === TokenType.RBRACE) parenDepth--;
      if (atLineStart && parenDepth === 0 && tok.type !== TokenType.NEWLINE && tok.type !== TokenType.EOF) {
        const indent = tok.col - 1;
        const top = indentStack[indentStack.length - 1];
        if (indent > top) { indentStack.push(indent); result.push({ type: TokenType.INDENT, value: 'INDENT', line: tok.line, col: 1 }); }
        else if (indent < top) { while (indentStack.length > 1 && indentStack[indentStack.length - 1] > indent) { indentStack.pop(); result.push({ type: TokenType.DEDENT, value: 'DEDENT', line: tok.line, col: 1 }); } if (indentStack[indentStack.length - 1] !== indent) throw new ParserError('Inconsistent indentation', tok.line); }
        atLineStart = false; result.push(tok);
      } else if (tok.type === TokenType.NEWLINE) { if (parenDepth > 0) { atLineStart = false; continue; } if (!atLineStart) result.push(tok); atLineStart = true; }
      else if (tok.type === TokenType.EOF) { while (indentStack.length > 1) { indentStack.pop(); result.push({ type: TokenType.DEDENT, value: 'DEDENT', line: tok.line, col: 1 }); } result.push(tok); }
      else { atLineStart = false; result.push(tok); }
    }
    return result;
  }

  private peek(offset = 0): Token { return this.tokens[Math.min(this.pos + offset, this.tokens.length - 1)]; }
  private advance(): Token { const tok = this.tokens[this.pos]; if (!this.isAtEnd()) this.pos++; return tok; }
  private isAtEnd(): boolean { return this.peek().type === TokenType.EOF; }
  private check(type: TokenType): boolean { return this.peek().type === type; }
  private checkKeyword(value: string): boolean { return this.peek().type === TokenType.KEYWORD && this.peek().value === value; }
  private match(...types: TokenType[]): boolean { for (const t of types) if (this.check(t)) { this.advance(); return true; } return false; }
  private matchKeyword(...values: string[]): boolean { if (this.peek().type === TokenType.KEYWORD && values.includes(this.peek().value)) { this.advance(); return true; } return false; }
  private expect(type: TokenType, what: string): Token { if (!this.check(type)) throw new ParserError(`Expected ${what}, got '${this.peek().value}'`, this.peek().line); return this.advance(); }
  private expectKeyword(value: string): Token { if (!this.checkKeyword(value)) throw new ParserError(`Expected '${value}', got '${this.peek().value}'`, this.peek().line); return this.advance(); }
  private currentLine(): number { return this.peek().line; }

  private statement(): ast.Node {
    const tok = this.peek();
    if (tok.type === TokenType.SEMICOLON) { this.advance(); return { type: 'Pass', line: tok.line }; }
    if (tok.type === TokenType.KEYWORD) {
      switch (tok.value) {
        case 'if': return this.ifStatement();
        case 'unless': return this.unlessStatement();
        case 'while': return this.whileStatement();
        case 'until': return this.untilStatement();
        case 'for': return this.forStatement();
        case 'repeat': return this.repeatStatement();
        case 'def': case 'fn': return this.funcDecl();
        case 'return': return this.returnStatement();
        case 'break': this.advance(); this.consumeNewline(); return { type: 'Break', line: tok.line };
        case 'continue': this.advance(); this.consumeNewline(); return { type: 'Continue', line: tok.line };
        case 'pass': this.advance(); this.consumeNewline(); return { type: 'Pass', line: tok.line };
        case 'class': return this.classDecl();
        case 'try': return this.tryStatement();
        case 'import': return this.importStatement();
        case 'global': return this.globalStatement();
        case 'nonlocal': return this.nonlocalStatement();
        case 'del': return this.deleteStatement();
        case 'match': return this.matchStatement();
        // v3.3.3 #21 — assert statement
        case 'assert': {
          this.advance();
          const test = this.expression();
          let msg: ast.Node | null = null;
          if (this.match(TokenType.COMMA)) msg = this.expression();
          this.consumeNewline();
          return { type: 'ExprStmt', expr: { type: 'Call', callee: { type: 'Identifier', name: '__assert__', line: tok.line }, args: msg ? [test, msg] : [test], line: tok.line }, line: tok.line };
        }
        case 'raise': {
          this.advance(); let value: ast.Node | null = null;
          if (!this.check(TokenType.NEWLINE) && !this.check(TokenType.EOF)) value = this.expression();
          this.consumeNewline();
          return { type: 'ExprStmt', expr: { type: 'Call', callee: { type: 'Identifier', name: '__raise__', line: tok.line }, args: value ? [value] : [], line: tok.line }, line: tok.line };
        }
      }
    }
    const expr = this.expression();
    if (this.check(TokenType.COMMA)) {
      const targets = [expr];
      while (this.match(TokenType.COMMA)) targets.push(this.ternary());
      if (this.check(TokenType.ASSIGN)) {
        const line = this.currentLine(); this.advance();
        let value: ast.Node = this.expression();
        if (this.check(TokenType.COMMA)) { const values = [value]; while (this.match(TokenType.COMMA)) values.push(this.ternary()); value = { type: 'Tuple', elements: values, line } as ast.Node; }
        this.consumeNewline();
        return { type: 'Assign', target: { type: 'Tuple', elements: targets, line } as ast.Node, value, line } as ast.AssignExpr;
      }
    }
    this.consumeNewline();
    return { type: 'ExprStmt', expr, line: tok.line };
  }

  private consumeNewline() { while (this.check(TokenType.NEWLINE)) this.advance(); }
  private block(): ast.Node[] {
    while (this.check(TokenType.NEWLINE)) this.advance();
    this.expect(TokenType.INDENT, 'indented block');
    const stmts: ast.Node[] = [];
    while (!this.check(TokenType.DEDENT) && !this.isAtEnd()) { while (this.check(TokenType.NEWLINE)) this.advance(); if (this.check(TokenType.DEDENT) || this.isAtEnd()) break; stmts.push(this.statement()); }
    if (this.check(TokenType.DEDENT)) this.advance();
    return stmts;
  }
  private inlineOrBlock(): ast.Node[] { if (!this.check(TokenType.NEWLINE) && !this.check(TokenType.INDENT) && !this.check(TokenType.EOF)) return [this.statement()]; return this.block(); }

  private ifStatement(): ast.IfStmt {
    const line = this.currentLine(); this.expectKeyword('if');
    const test = this.expression(); this.expect(TokenType.COLON, ':');
    const body = this.inlineOrBlock();
    const elifs: { test: ast.Node; body: ast.Node[] }[] = [];
    let elseBody: ast.Node[] | null = null;
    while (this.checkKeyword('elif')) { this.advance(); const elifTest = this.expression(); this.expect(TokenType.COLON, ':'); elifs.push({ test: elifTest, body: this.inlineOrBlock() }); }
    if (this.checkKeyword('else')) { this.advance(); this.expect(TokenType.COLON, ':'); elseBody = this.inlineOrBlock(); }
    return { type: 'If', test, body, elifs, elseBody, line };
  }
  private unlessStatement(): ast.UnlessStmt {
    const line = this.currentLine(); this.expectKeyword('unless');
    const test = this.expression(); this.expect(TokenType.COLON, ':');
    const body = this.inlineOrBlock();
    let elseBody: ast.Node[] | null = null;
    if (this.checkKeyword('else')) { this.advance(); this.expect(TokenType.COLON, ':'); elseBody = this.inlineOrBlock(); }
    return { type: 'Unless', test, body, elseBody, line };
  }
  private whileStatement(): ast.WhileStmt { const line = this.currentLine(); this.expectKeyword('while'); const test = this.expression(); this.expect(TokenType.COLON, ':'); return { type: 'While', test, body: this.block(), line }; }
  private untilStatement(): ast.UntilStmt { const line = this.currentLine(); this.expectKeyword('until'); const test = this.expression(); this.expect(TokenType.COLON, ':'); return { type: 'Until', test, body: this.block(), line }; }
  private forStatement(): ast.ForStmt {
    const line = this.currentLine(); this.expectKeyword('for');
    const varNames = [this.expect(TokenType.IDENT, 'variable name').value];
    while (this.match(TokenType.COMMA)) varNames.push(this.expect(TokenType.IDENT, 'variable name').value);
    this.expectKeyword('in'); const iterable = this.expression(); this.expect(TokenType.COLON, ':');
    return { type: 'For', varNames, iterable, body: this.block(), line };
  }
  private repeatStatement(): ast.RepeatStmt {
    const line = this.currentLine(); this.expectKeyword('repeat');
    const count = this.expression();
    let varName: string | null = null;
    if (this.matchKeyword('times')) { if (this.check(TokenType.IDENT)) varName = this.advance().value; }
    else if (this.matchKeyword('as')) varName = this.expect(TokenType.IDENT, 'variable name').value;
    this.expect(TokenType.COLON, ':');
    return { type: 'Repeat', count, varName, body: this.block(), line };
  }
  private funcDecl(): ast.FuncDecl {
    const line = this.currentLine(); this.advance();
    const nameTok = this.expect(TokenType.IDENT, 'function name');
    this.expect(TokenType.LPAREN, '(');
    const params: { name: string; default?: ast.Node | null }[] = [];
    if (!this.check(TokenType.RPAREN)) {
      do { const p = this.expect(TokenType.IDENT, 'parameter name').value; let def: ast.Node | null = null; if (this.match(TokenType.ASSIGN)) def = this.expression(); params.push({ name: p, default: def }); } while (this.match(TokenType.COMMA));
    }
    this.expect(TokenType.RPAREN, ')'); this.expect(TokenType.COLON, ':');
    return { type: 'FuncDecl', name: nameTok.value, params, body: this.inlineOrBlock(), line };
  }
  private returnStatement(): ast.ReturnStmt {
    const line = this.currentLine(); this.expectKeyword('return');
    let value: ast.Node | null = null;
    if (!this.check(TokenType.NEWLINE) && !this.check(TokenType.EOF)) value = this.expression();
    this.consumeNewline();
    return { type: 'Return', value, line };
  }
  private classDecl(): ast.ClassDecl {
    const line = this.currentLine(); this.expectKeyword('class');
    const nameTok = this.expect(TokenType.IDENT, 'class name');
    let base: ast.Node | null = null;
    const bases: ast.Node[] = [];
    // v3.3.3 #15 — support multiple inheritance: class C(A, B):
    if (this.match(TokenType.LPAREN)) {
      if (!this.check(TokenType.RPAREN)) {
        do { bases.push(this.expression()); } while (this.match(TokenType.COMMA));
      }
      this.expect(TokenType.RPAREN, ')');
      if (bases.length > 0) base = bases[0];
    }
    this.expect(TokenType.COLON, ':');
    return { type: 'ClassDecl', name: nameTok.value, base, bases, body: this.inlineOrBlock(), line };
  }
  private tryStatement(): ast.TryStmt {
    const line = this.currentLine(); this.expectKeyword('try'); this.expect(TokenType.COLON, ':');
    const body = this.block();
    // v3.3.3 #6 — support `except TypeName as varName:` syntax
    const handlers: { varName: string; typeName: string; body: ast.Node[] }[] = [];
    while (this.checkKeyword('except')) {
      this.advance();
      let typeName = '';
      let varName = '';
      // v3.3.3 #6 — parse `except TypeName as var:` or `except TypeName:` or `except var:`
      if (this.check(TokenType.IDENT)) {
        const first = this.advance().value;
        if (this.matchKeyword('as')) {
          // `except TypeName as varName:`
          typeName = first;
          varName = this.expect(TokenType.IDENT, 'variable name').value;
        } else {
          // `except TypeName:` (with typeName) OR `except var:` (with varName).
          // Heuristic: well-known exception class names → typeName.
          // Otherwise → varName (backward compat with `except e:` syntax).
          const KNOWN_EXC = new Set(['Exception', 'ValueError', 'TypeError', 'KeyError',
            'IndexError', 'RuntimeError', 'ZeroDivisionError', 'AttributeError',
            'StopIteration', 'AssertionError', 'IOError', 'FileNotFoundError',
            'NameError', 'NotImplementedError', 'OverflowError']);
          if (KNOWN_EXC.has(first)) typeName = first;
          else varName = first;
        }
      }
      this.expect(TokenType.COLON, ':');
      handlers.push({ varName, typeName, body: this.block() });
    }
    let elseBody: ast.Node[] | null = null;
    if (this.checkKeyword('else')) { this.advance(); this.expect(TokenType.COLON, ':'); elseBody = this.block(); }
    let finallyBody: ast.Node[] | null = null;
    if (this.checkKeyword('finally')) { this.advance(); this.expect(TokenType.COLON, ':'); finallyBody = this.block(); }
    return { type: 'Try', body, handlers, elseBody, finallyBody, line };
  }
  private importStatement(): ast.ImportStmt {
    const line = this.currentLine(); this.expectKeyword('import');
    const names: { name: string; alias: string | null }[] = [];
    do { const modName = this.expect(TokenType.IDENT, 'module name').value; let alias: string | null = null; if (this.matchKeyword('as')) alias = this.expect(TokenType.IDENT, 'alias').value; names.push({ name: modName, alias }); } while (this.match(TokenType.COMMA));
    this.consumeNewline();
    return { type: 'Import', names, line };
  }
  private globalStatement(): ast.GlobalStmt {
    const line = this.currentLine(); this.expectKeyword('global');
    const names = [this.expect(TokenType.IDENT, 'variable name').value];
    while (this.match(TokenType.COMMA)) names.push(this.expect(TokenType.IDENT, 'variable name').value);
    this.consumeNewline();
    return { type: 'Global', names, line };
  }
  private nonlocalStatement(): ast.NonlocalStmt {
    const line = this.currentLine(); this.expectKeyword('nonlocal');
    const names = [this.expect(TokenType.IDENT, 'variable name').value];
    while (this.match(TokenType.COMMA)) names.push(this.expect(TokenType.IDENT, 'variable name').value);
    this.consumeNewline();
    return { type: 'Nonlocal', names, line };
  }
  private deleteStatement(): ast.DeleteStmt {
    const line = this.currentLine(); this.expectKeyword('del');
    const targets = [this.expression()];
    while (this.match(TokenType.COMMA)) targets.push(this.expression());
    this.consumeNewline();
    return { type: 'Delete', targets, line };
  }
  private matchStatement(): ast.MatchStmt {
    const line = this.currentLine(); this.expectKeyword('match');
    const subject = this.expression();
    this.expect(TokenType.COLON, ':');
    while (this.check(TokenType.NEWLINE)) this.advance();
    this.expect(TokenType.INDENT, 'indented match body');
    const cases: { pattern: ast.Node; guard: ast.Node | null; body: ast.Node[] }[] = [];
    let defaultCase: ast.Node[] | null = null;
    while (this.checkKeyword('case') || this.checkKeyword('default') || this.checkKeyword('when')) {
      const isDefault = this.checkKeyword('default'); this.advance();
      if (isDefault) { this.expect(TokenType.COLON, ':'); defaultCase = this.inlineOrBlock(); break; }
      // v3.3.3 #11 — case _ is treated as wildcard (pattern is None literal)
      let pattern: ast.Node;
      if (this.check(TokenType.IDENT) && this.peek().value === '_') {
        this.advance(); // consume _
        pattern = { type: 'None', line: this.currentLine() } as ast.Node;
        // Mark as wildcard — interpreter will handle by always matching
        (pattern as any).__wildcard = true;
      } else {
        // v3.3.3 #10 — use orExpr() instead of expression() to avoid
        // consuming the `if` keyword as a ternary operator.
        pattern = this.orExpr();
      }
      // v3.3.3 #10 — guard clause: use orExpr() instead of expression() to
      // avoid ternary `if` collision. `case x if cond:` — cond is orExpr-level.
      let guard: ast.Node | null = null;
      if (this.checkKeyword('if')) {
        this.advance();
        guard = this.orExpr();  // parse guard without ternary
      }
      this.expect(TokenType.COLON, ':');
      const body = this.inlineOrBlock();
      cases.push({ pattern, guard, body });
    }
    if (this.check(TokenType.DEDENT)) this.advance();
    return { type: 'Match', subject, cases, defaultCase, line };
  }

  private expression(): ast.Node { return this.assignment(); }
  private assignment(): ast.Node {
    const expr = this.callArg();
    if (this.check(TokenType.WALRUS)) { const line = this.currentLine(); this.advance(); const value = this.assignment(); if (expr.type !== 'Identifier') throw new ParserError('Walrus operator := requires identifier', line); return { type: 'Walrus', name: (expr as ast.Identifier).name, value, line }; }
    if (this.check(TokenType.ASSIGN)) { const line = this.currentLine(); this.advance(); const value = this.assignment(); if (expr.type !== 'Identifier' && expr.type !== 'Index' && expr.type !== 'Member') throw new ParserError('Invalid assignment target', line); return { type: 'Assign', target: expr, value, line }; }
    if (this.check(TokenType.AUG_ASSIGN)) { const line = this.currentLine(); const op = this.advance().value; const value = this.assignment(); return { type: 'AugAssign', op, target: expr, value, line }; }
    return expr;
  }
  private ternary(): ast.Node {
    const cond = this.orExpr();
    if (this.checkKeyword('if')) {
      const line = this.currentLine(); this.advance(); const test = this.orExpr();
      if (this.checkKeyword('else')) {
        this.advance(); const elseVal = this.ternary();
        return {
          type: 'If', test,
          body: [{ type: 'ExprStmt', expr: cond, line }],
          elifs: [],
          elseBody: [{ type: 'ExprStmt', expr: elseVal, line }],
          line
        } as ast.Node;
      }
      throw new ParserError('Expected else in ternary', line);
    }
    return cond;
  }
  private callArg(): ast.Node {
    let left = this.ternary();
    while (this.check(TokenType.PIPELINE)) { const line = this.currentLine(); this.advance(); left = { type: 'Pipeline', left, right: this.ternary(), line }; }
    while (this.check(TokenType.NULL_COALESCE)) { const line = this.currentLine(); this.advance(); left = { type: 'NullCoalesce', left, right: this.ternary(), line }; }
    return left;
  }
  private orExpr(): ast.Node { let left = this.andExpr(); while (this.checkKeyword('or')) { const line = this.currentLine(); this.advance(); left = { type: 'Logical', op: 'or', left, right: this.andExpr(), line }; } return left; }
  private andExpr(): ast.Node { let left = this.notExpr(); while (this.checkKeyword('and')) { const line = this.currentLine(); this.advance(); left = { type: 'Logical', op: 'and', left, right: this.notExpr(), line }; } return left; }
  private notExpr(): ast.Node { if (this.checkKeyword('not')) { const line = this.currentLine(); this.advance(); return { type: 'Unary', op: 'not', operand: this.notExpr(), line }; } return this.comparison(); }
  private comparison(): ast.Node {
    const left = this.additive();
    const ops: Record<number, string> = { [TokenType.EQ]:'==', [TokenType.NEQ]:'!=', [TokenType.LT]:'<', [TokenType.GT]:'>', [TokenType.LTE]:'<=', [TokenType.GTE]:'>=' };
    if (this.peek().type in ops) {
      const line = this.currentLine(); const op = ops[this.peek().type]; this.advance();
      const right = this.additive();
      // v3.3.3 #24 — chained comparison: 1 < x < 10
      if (this.peek().type in ops || this.checkKeyword('in')) {
        const ops2: Record<number, string> = ops;
        if (this.peek().type in ops2) {
          const line2 = this.currentLine(); const op2 = ops2[this.peek().type]; this.advance();
          const right2 = this.additive();
          return { type: 'Logical', op: 'and', left: { type: 'Compare', ops: [op], operands: [left, right], line }, right: { type: 'Compare', ops: [op2], operands: [right, right2], line2 }, line } as any;
        }
      }
      return { type: 'Compare', ops: [op], operands: [left, right], line };
    }
    // v3.3.3 #25 — is / is not operators
    if (this.checkKeyword('is')) {
      const line = this.currentLine(); this.advance();
      if (this.checkKeyword('not')) { this.advance(); return { type: 'Compare', ops: ['is not'], operands: [left, this.additive()], line }; }
      return { type: 'Compare', ops: ['is'], operands: [left, this.additive()], line };
    }
    if (this.checkKeyword('in')) { const line = this.currentLine(); this.advance(); return { type: 'Compare', ops: ['in'], operands: [left, this.additive()], line }; }
    if (this.checkKeyword('not') && this.peek(1).type === TokenType.KEYWORD && (this.peek(1) as any).value === 'in') { const line = this.currentLine(); this.advance(); this.advance(); return { type: 'Compare', ops: ['not in'], operands: [left, this.additive()], line }; }
    return left;
  }
  private additive(): ast.Node { let left = this.bitwiseOr(); while (this.check(TokenType.PLUS) || this.check(TokenType.MINUS)) { const line = this.currentLine(); const op = this.advance().value; left = { type: 'Binary', op, left, right: this.bitwiseOr(), line }; } return left; }
  // v3.3.3 #16+#17 — bitwise operators: | ^ & << >>
  private bitwiseOr(): ast.Node { let left = this.bitwiseXor(); while (this.check(TokenType.PIPE)) { const line = this.currentLine(); this.advance(); left = { type: 'Binary', op: '|', left, right: this.bitwiseXor(), line }; } return left; }
  private bitwiseXor(): ast.Node { let left = this.bitwiseAnd(); while (this.check(TokenType.CARET)) { const line = this.currentLine(); this.advance(); left = { type: 'Binary', op: '^', left, right: this.bitwiseAnd(), line }; } return left; }
  private bitwiseAnd(): ast.Node { let left = this.shift(); while (this.check(TokenType.AMP)) { const line = this.currentLine(); this.advance(); left = { type: 'Binary', op: '&', left, right: this.shift(), line }; } return left; }
  private shift(): ast.Node { let left = this.power(); while (this.check(TokenType.LSHIFT) || this.check(TokenType.RSHIFT)) { const line = this.currentLine(); const op = this.advance().value; left = { type: 'Binary', op, left, right: this.power(), line }; } return left; }
  private power(): ast.Node { let left = this.multiplicative(); while (this.check(TokenType.POWER)) { const line = this.currentLine(); this.advance(); left = { type: 'Binary', op: '**', left, right: this.unary(), line }; } return left; }
  private multiplicative(): ast.Node { let left = this.unary(); while (this.check(TokenType.MULTIPLY) || this.check(TokenType.DIVIDE) || this.check(TokenType.FLOOR_DIV) || this.check(TokenType.MODULO)) { const line = this.currentLine(); const op = this.advance().value; left = { type: 'Binary', op, left, right: this.unary(), line }; } return left; }
  private unary(): ast.Node {
    // v3.3.3 #16 — bitwise NOT (~)
    if (this.check(TokenType.TILDE)) { const line = this.currentLine(); const op = this.advance().value; return { type: 'Unary', op, operand: this.unary(), line }; }
    if (this.check(TokenType.MINUS) || this.check(TokenType.PLUS)) { const line = this.currentLine(); const op = this.advance().value; return { type: 'Unary', op, operand: this.unary(), line }; }
    return this.postfix();
  }
  private postfix(): ast.Node {
    let expr = this.primary();
    while (true) {
      if (this.check(TokenType.LPAREN)) {
        const line = this.currentLine(); this.advance();
        const args: ast.Node[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            if (this.check(TokenType.SPREAD)) { this.advance(); args.push({ type: 'Spread', expr: this.ternary(), line }); }
            else if (this.check(TokenType.IDENT) && this.peek(1).type === TokenType.ASSIGN) {
              const kwName = this.advance().value;
              this.advance();
              const kwVal = this.ternary();
              args.push({ type: 'Call', callee: { type: 'Identifier', name: '__kwarg__', line }, args: [{ type: 'String', value: kwName, line }, kwVal], line } as ast.Node);
            }
            else args.push(this.callArg());
          } while (this.match(TokenType.COMMA));
        }
        this.expect(TokenType.RPAREN, ')'); expr = { type: 'Call', callee: expr, args, line };
      } else if (this.check(TokenType.LBRACKET)) {
        const line = this.currentLine(); this.advance();
        let startIndex: ast.Node | null = null; let endIndex: ast.Node | null = null; let stepIndex: ast.Node | null = null; let isSlice = false;
        if (!this.check(TokenType.COLON)) startIndex = this.expression();
        if (this.match(TokenType.COLON)) {
          isSlice = true;
          if (!this.check(TokenType.RBRACKET) && !this.check(TokenType.COLON)) endIndex = this.expression();
          if (this.match(TokenType.COLON)) {
            if (!this.check(TokenType.RBRACKET)) stepIndex = this.expression();
          }
        }
        this.expect(TokenType.RBRACKET, ']');
        if (isSlice) expr = { type: 'Call', callee: { type: 'Identifier', name: '__slice__', line }, args: [expr, startIndex ?? { type: 'None', line }, endIndex ?? { type: 'None', line }, stepIndex ?? { type: 'None', line }], line };
        else expr = { type: 'Index', obj: expr, index: startIndex!, line };
      } else if (this.check(TokenType.DOT)) { const line = this.currentLine(); this.advance(); const prop = this.expect(TokenType.IDENT, 'property name'); expr = { type: 'Member', obj: expr, property: prop.value, line }; }
      else break;
    }
    return expr;
  }
  private primary(): ast.Node {
    const tok = this.peek();
    switch (tok.type) {
      case TokenType.NUMBER: this.advance(); return { type: 'Number', value: parseFloat(tok.value), line: tok.line };
      case TokenType.STRING: {
        this.advance();
        if (tok.value.startsWith('__interp__')) {
          const partsJson = tok.value.slice(10);
          const rawParts = JSON.parse(partsJson) as (string | { expr: string })[];
          const parts: (string | ast.Node)[] = [];
          for (const p of rawParts) {
            if (typeof p === 'string') parts.push(p);
            else { const subParser = new Parser(); const subLexer = new Lexer(p.expr); subParser.tokens = subParser.processIndentation(subLexer.tokenize()); subParser.pos = 0; parts.push(subParser.expression()); }
          }
          return { type: 'InterpString', parts, line: tok.line };
        }
        return { type: 'String', value: tok.value, line: tok.line };
      }
      case TokenType.TRUE: this.advance(); return { type: 'Boolean', value: true, line: tok.line };
      case TokenType.FALSE: this.advance(); return { type: 'Boolean', value: false, line: tok.line };
      case TokenType.NONE: this.advance(); return { type: 'None', line: tok.line };
      case TokenType.IDENT: this.advance(); return { type: 'Identifier', name: tok.value, line: tok.line };
      case TokenType.LPAREN: {
        this.advance();
        if (this.check(TokenType.RPAREN)) { this.advance(); return { type: 'Tuple', elements: [], line: tok.line }; }
        const expr = this.expression();
        if (this.match(TokenType.COMMA)) { const elements = [expr]; while (!this.check(TokenType.RPAREN)) { elements.push(this.expression()); if (!this.match(TokenType.COMMA)) break; } this.expect(TokenType.RPAREN, ')'); return { type: 'Tuple', elements, line: tok.line }; }
        this.expect(TokenType.RPAREN, ')'); return expr;
      }
      case TokenType.LBRACKET: {
        const line = tok.line; this.advance();
        const elements: ast.Node[] = [];
        while (!this.check(TokenType.RBRACKET)) { if (this.check(TokenType.SPREAD)) { this.advance(); elements.push({ type: 'Spread', expr: this.expression(), line }); } else elements.push(this.expression()); if (!this.match(TokenType.COMMA)) break; }
        this.expect(TokenType.RBRACKET, ']');
        return { type: 'List', elements, line };
      }
      case TokenType.LBRACE: {
        const line = tok.line; this.advance();
        const pairs: { key: ast.Node; value: ast.Node }[] = [];
        while (!this.check(TokenType.RBRACE)) { const key = this.expression(); this.expect(TokenType.COLON, ':'); const value = this.expression(); pairs.push({ key, value }); if (!this.match(TokenType.COMMA)) break; }
        this.expect(TokenType.RBRACE, '}'); return { type: 'Dict', pairs, line };
      }
      case TokenType.KEYWORD:
        if (tok.value === 'lambda' || tok.value === 'fn') {
          const line = tok.line; this.advance();
          const params: { name: string; default?: ast.Node | null }[] = [];
          if (!this.check(TokenType.COLON)) { do { const p = this.expect(TokenType.IDENT, 'parameter name').value; let def: ast.Node | null = null; if (this.match(TokenType.ASSIGN)) def = this.expression(); params.push({ name: p, default: def }); } while (this.match(TokenType.COMMA)); }
          this.expect(TokenType.COLON, ':');
          const bodyExpr = this.expression();
          return { type: 'FuncDecl', name: '<lambda>', params, body: [{ type: 'Return', value: bodyExpr, line }], line } as ast.FuncDecl;
        }
        break;
    }
    throw new ParserError(`Unexpected token '${tok.value}'`, tok.line);
  }
}
