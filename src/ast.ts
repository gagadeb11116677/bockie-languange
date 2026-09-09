export type Node =
  | ProgramNode | NumberLiteral | StringLiteral | InterpStringNode | BooleanLiteral | NoneLiteral
  | Identifier | ListLiteral | DictLiteral | TupleLiteral
  | BinaryExpr | UnaryExpr | LogicalExpr | PipelineExpr | NullCoalesceExpr | SpreadExpr | CompareExpr
  | AssignExpr | AugAssignExpr | WalrusExpr | CallExpr | IndexExpr | MemberExpr
  | IfStmt | WhileStmt | UntilStmt | ForStmt | RepeatStmt | FuncDecl | ReturnStmt | BreakStmt
  | ContinueStmt | PassStmt | ExprStmt | ClassDecl | TryStmt | ImportStmt | GlobalStmt | DeleteStmt
  | MatchStmt | UnlessStmt;

export interface ProgramNode { type: 'Program'; body: Node[]; }
export interface NumberLiteral { type: 'Number'; value: number; line: number; }
export interface StringLiteral { type: 'String'; value: string; line: number; }
export interface InterpStringNode { type: 'InterpString'; parts: (string | Node)[]; line: number; }
export interface BooleanLiteral { type: 'Boolean'; value: boolean; line: number; }
export interface NoneLiteral { type: 'None'; line: number; }
export interface Identifier { type: 'Identifier'; name: string; line: number; }
export interface ListLiteral { type: 'List'; elements: Node[]; line: number; }
export interface DictLiteral { type: 'Dict'; pairs: { key: Node; value: Node }[]; line: number; }
export interface TupleLiteral { type: 'Tuple'; elements: Node[]; line: number; }
export interface BinaryExpr { type: 'Binary'; op: string; left: Node; right: Node; line: number; }
export interface UnaryExpr { type: 'Unary'; op: string; operand: Node; line: number; }
export interface LogicalExpr { type: 'Logical'; op: 'and' | 'or'; left: Node; right: Node; line: number; }
export interface PipelineExpr { type: 'Pipeline'; left: Node; right: Node; line: number; }
export interface NullCoalesceExpr { type: 'NullCoalesce'; left: Node; right: Node; line: number; }
export interface SpreadExpr { type: 'Spread'; expr: Node; line: number; }
export interface CompareExpr { type: 'Compare'; ops: string[]; operands: Node[]; line: number; }
export interface AssignExpr { type: 'Assign'; target: Node; value: Node; line: number; }
export interface AugAssignExpr { type: 'AugAssign'; op: string; target: Node; value: Node; line: number; }
export interface WalrusExpr { type: 'Walrus'; name: string; value: Node; line: number; }
export interface CallExpr { type: 'Call'; callee: Node; args: Node[]; line: number; }
export interface IndexExpr { type: 'Index'; obj: Node; index: Node; line: number; }
export interface MemberExpr { type: 'Member'; obj: Node; property: string; line: number; }
export interface IfStmt { type: 'If'; test: Node; body: Node[]; elifs: { test: Node; body: Node[] }[]; elseBody: Node[] | null; line: number; }
export interface WhileStmt { type: 'While'; test: Node; body: Node[]; line: number; }
export interface UntilStmt { type: 'Until'; test: Node; body: Node[]; line: number; }
export interface ForStmt { type: 'For'; varNames: string[]; iterable: Node; body: Node[]; line: number; }
export interface RepeatStmt { type: 'Repeat'; count: Node; varName: string | null; body: Node[]; line: number; }
export interface FuncDecl { type: 'FuncDecl'; name: string; params: { name: string; default?: Node | null }[]; body: Node[]; line: number; }
export interface ReturnStmt { type: 'Return'; value: Node | null; line: number; }
export interface BreakStmt { type: 'Break'; line: number; }
export interface ContinueStmt { type: 'Continue'; line: number; }
export interface PassStmt { type: 'Pass'; line: number; }
export interface ExprStmt { type: 'ExprStmt'; expr: Node; line: number; }
export interface ClassDecl { type: 'ClassDecl'; name: string; base: Node | null; body: Node[]; line: number; }
export interface TryStmt { type: 'Try'; body: Node[]; handlers: { varName: string; body: Node[] }[]; elseBody: Node[] | null; finallyBody: Node[] | null; line: number; }
export interface ImportStmt { type: 'Import'; names: { name: string; alias: string | null }[]; line: number; }
export interface GlobalStmt { type: 'Global'; names: string[]; line: number; }
export interface DeleteStmt { type: 'Delete'; targets: Node[]; line: number; }
export interface MatchStmt { type: 'Match'; subject: Node; cases: { pattern: Node; guard: Node | null; body: Node[] }[]; defaultCase: Node[] | null; line: number; }
export interface UnlessStmt { type: 'Unless'; test: Node; body: Node[]; elseBody: Node[] | null; line: number; }
