/** JSONCliff: source-linked evidence for the native JSON round trip. */
export const VERSION = '0.1.0';
export const LIMITS = Object.freeze({ bytes: 1_048_576, tokens: 60_000, depth: 128, numberLength: 4096, entries: 20_000 });
export const DEMO_SOURCE = '{\n  "id": 9007199254740993,\n  "status": "pending",\n  "status": "paid",\n  "balance": 1e400,\n  "offset": -0,\n  "price": 1.2300,\n  "ordinaryDecimal": 0.1\n}';
export type Severity = 'change' | 'risk' | 'info';
export interface Finding {
  id: string; code: string; severity: Severity; pointer: string; occurrence: number;
  start: number; end: number; line: number; column: number; title: string; message: string;
  before: string; after: string | null; survives: boolean;
}
export interface DiagnosticError { code: string; message: string; start: number; end: number; line: number; column: number }
export interface Report {
  schemaVersion: '1.0'; engine: 'JSONCliff'; version: string; valid: boolean; source: string; output: string | null;
  findings: Finding[]; stats: { bytes: number; tokens: number; depth: number; numbers: number; duplicates: number };
  limits: typeof LIMITS; error?: DiagnosticError;
}
type Node = { kind: string; start: number; end: number; id: number; children: Node[]; props: Prop[]; raw?: string };
type Prop = { key: string; start: number; end: number; value: Node; occurrence: number; overwritten: boolean };
class Fault extends Error { constructor(public code: string, message: string, public offset: number) {super(message);} }
/** A strict bounded syntax pass. It builds a source tree, never a user object. */
class Scanner {
  i = 0; tokens = 0; depth = 0; numbers = 0; duplicates = 0; entries = 0; serial = 0;
  constructor(readonly s: string) {}
  fail(message: string): never { throw new Fault('invalid-json', message, this.i); }
  tick() { if (++this.tokens > LIMITS.tokens) throw new Fault('limit-tokens', `Input exceeds ${LIMITS.tokens} tokens.`, this.i); }
  entry() { if (++this.entries > LIMITS.entries) throw new Fault('limit-entries', `Input exceeds ${LIMITS.entries} array items and object properties.`, this.i); }
  ws() { while (this.i < this.s.length && /[\x20\x09\x0a\x0d]/.test(this.s[this.i])) this.i++; }
  char(c: string) { this.ws(); if (this.s[this.i] !== c) this.fail(`Expected ${JSON.stringify(c)}.`); this.tick(); this.i++; }
  string(): string {
    this.ws(); this.tick(); if(this.s[this.i++] !== '"') this.fail('Expected a string.');
    let out = '';
    while (this.i < this.s.length) {
      const c = this.s[this.i++];
      if(c === '"') return out;
      if(c.charCodeAt(0) < 32) this.fail('Unescaped control character in string.');
      if(c !== '\\') {out += c; continue;}
      const e = this.s[this.i++];
      const simple: Record<string, string> = {'"':'"','\\':'\\','/':'/','b':'\b','f':'\f','n':'\n','r':'\r','t':'\t'};
      if(Object.prototype.hasOwnProperty.call(simple,e)) {out+=simple[e];continue;}
      if(e !== 'u') this.fail('Invalid string escape.');
      const h = this.s.slice(this.i,this.i+4);
      if(!/^[\da-fA-F]{4}$/.test(h)) this.fail('A Unicode escape needs four hexadecimal digits.');
      out+=String.fromCharCode(parseInt(h,16));this.i+=4;
    }
    this.fail('Unterminated string.');
  }
  value(level: number): Node {
    this.ws(); this.depth = Math.max(this.depth,level);
    if(level>LIMITS.depth) throw new Fault('limit-depth',`Input exceeds nesting depth ${LIMITS.depth}.`,this.i);
    const n: Node = {kind:'',start:this.i,end:0,id:++this.serial,children:[],props:[]};
    const c=this.s[this.i];
    if(c==='{' || c==='[') {
      n.kind=c==='{'?'object':'array'; this.char(c);this.ws();
      const close=c==='{'?'}':']'; const seen=new Map<string,Prop>(); const counts=new Map<string,number>();
      if(this.s[this.i]!==close) {
        while(true) {
          this.entry();this.ws();
          if(c==='{') {
            const start=this.i; if(this.s[this.i]!=='"') this.fail('Object keys must be double-quoted strings.');
            const key=this.string();this.char(':');const value=this.value(level+1);
            const occurrence=(counts.get(key)||0)+1;counts.set(key,occurrence);
            const p:Prop={key,start,end:value.end,value,occurrence,overwritten:false};
            const prev=seen.get(key);if(prev){prev.overwritten=true;this.duplicates++;}seen.set(key,p);n.props.push(p);
          } else n.children.push(this.value(level+1));
          this.ws();if(this.s[this.i]===close)break;
          this.char(',');this.ws();if(this.s[this.i]===close)this.fail('Trailing commas are not valid JSON.');
        }
      }
      this.char(close);
    } else if(c==='"') {n.kind='string';this.string();}
    else if(c==='-' || (c>='0'&&c<='9')) {
      n.kind='number';this.tick();const start=this.i;
      // Scan one bounded token before applying strict JSON number grammar.
      while(this.i<this.s.length && /[0-9eE+\-.]/.test(this.s[this.i])) {
        this.i++;if(this.i-start>LIMITS.numberLength)throw new Fault('limit-number',`Numeric tokens are limited to ${LIMITS.numberLength} characters.`,start);
      }
      n.raw=this.s.slice(start,this.i);
      if(!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(n.raw))this.fail('Invalid JSON number.');
      this.numbers++;
    } else {
      const word=['true','false','null'].find(w=>this.s.startsWith(w,this.i));
      if(!word)this.fail('Expected a JSON value.');
      n.kind=word;this.tick();this.i+=word.length;
    }
    n.end=this.i;return n;
  }
  parse() {const n=this.value(0);this.ws();if(this.i!==this.s.length)this.fail('Unexpected characters after JSON value.');return n;}
}
type Decimal={negative:boolean;digits:string;exponent:bigint};
/** Never expand powers of ten: exponent size is bounded by the token limit. */
function decimal(s:string):Decimal {
  const m=/^(-?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/.exec(s)!;
  let digits=(m[2]+(m[3]||'')).replace(/^0+/,'');
  let exponent=BigInt(m[4]||'0')-BigInt((m[3]||'').length);
  if(!digits)return {negative:false,digits:'0',exponent:0n};
  const trailing=/0+$/.exec(digits)?.[0].length||0;
  if(trailing){digits=digits.slice(0,-trailing);exponent+=BigInt(trailing);}
  return {negative:!!m[1],digits,exponent};
}
function sameDecimal(a:Decimal,b:Decimal){return a.negative===b.negative&&a.digits===b.digits&&a.exponent===b.exponent;}
const preview=(s:string)=>s.length>1024?s.slice(0,1024)+'… [preview truncated; use source span]':s;
const pointerPart=(s:string)=>s.replace(/~/g,'~0').replace(/\//g,'~1');
export function analyze(source:string):Report {
  if(typeof source!=='string')throw new TypeError('analyze expects a JSON source string.');
  const bytes=new TextEncoder().encode(source.length>LIMITS.bytes?source.slice(0,LIMITS.bytes+1):source).byteLength;
  const report:Report={schemaVersion:'1.0',engine:'JSONCliff',version:VERSION,valid:false,source,output:null,findings:[],stats:{bytes,tokens:0,depth:0,numbers:0,duplicates:0},limits:LIMITS};
  const starts=[0];for(let i=0;i<Math.min(source.length,LIMITS.bytes+1);i++)if(source[i]==='\n')starts.push(i+1);
  function loc(start:number){let lo=0,hi=starts.length;while(lo+1<hi){const mid=(lo+hi)>>1;if(starts[mid]<=start)lo=mid;else hi=mid;}return {line:lo+1,column:start-starts[lo]+1};}
  const scanner=new Scanner(source);
  try {
    if(bytes>LIMITS.bytes)throw new Fault('limit-bytes',`Input exceeds the ${LIMITS.bytes} byte (1 MiB) limit.`,0);
    const root=scanner.parse();
    // The entire source has passed strict grammar and work limits before native parsing.
    const native=JSON.parse(source);report.output=JSON.stringify(native,null,2);report.valid=true;
    const add=(n:Node,pointer:string,occurrence:number,code:string,severity:Severity,title:string,message:string,before:string,after:string|null,survives=true,start=n.start,end=n.end)=>{
      report.findings.push({id:`${n.id}:${code}:${start}`,code,severity,title,message,before,after,pointer,occurrence,start,end,...loc(start),survives});
    };
    function visit(n:Node,path:string,occurrence:number,live:boolean) {
      if(n.kind==='number' && live) {
        const raw=n.raw!,value=Number(raw),serialized=JSON.stringify(value),exact=decimal(raw);
        if(!Number.isFinite(value))add(n,path,occurrence,'overflow','change','Finite JSON number becomes null','JavaScript converts this finite decimal to '+(value<0?'-Infinity':'Infinity')+'. JSON.stringify writes null.',raw,'null');
        else if(Object.is(value,-0)&&exact.digits==='0') add(n,path,occurrence,'negative-zero','change','Negative zero loses its sign','JSON.parse keeps JavaScript -0, but JSON.stringify writes 0. Sign-sensitive operations can distinguish them.',raw,'0');
        else if(!sameDecimal(exact,decimal(serialized))) {
          const underflow=value===0&&exact.digits!=='0';
          add(n,path,occurrence,underflow?'underflow':'precision-loss','change',underflow?'Small number becomes zero':'Numeric value changes',underflow?'The finite source decimal is too small for a nonzero JavaScript Number.':'The exact decimal value in the source differs from the decimal emitted by the native round trip.',raw,serialized);
        } else if(Number.isInteger(value)&&!Number.isSafeInteger(value)) {
          add(n,path,occurrence,'unsafe-integer','risk','Preserved, outside the safe integer range','This decimal value survives this round trip, but adjacent integers may not. This is a risk, not an observed value change.',raw,serialized);
          if(raw!==serialized)add(n,path,occurrence,'representation','info','Number spelling changes','The source and output represent the same exact decimal value. Formatting or exponent notation changed.',raw,serialized);
        } else if(raw!==serialized) add(n,path,occurrence,'representation','info','Number spelling changes','The source and output represent the same exact decimal value. Formatting or exponent notation changed.',raw,serialized);
      }
      if(n.kind==='array')n.children.forEach((child,i)=>visit(child,`${path}/${i}`,1,live));
      if(n.kind==='object'){
        const last=new Map(n.props.map(p=>[p.key,p]));
        for(const p of n.props) {
          const childPath=`${path}/${pointerPart(p.key)}`;
          if(p.overwritten) {
            const winner=last.get(p.key)!;
            add(p.value,childPath,p.occurrence,'duplicate-key','change','Earlier property is overwritten',`Decoded key ${JSON.stringify(p.key)} appears more than once. Occurrence ${p.occurrence} is replaced by occurrence ${winner.occurrence}. The replacement preview shows its source spelling.${live?'':' Its containing value is also overwritten.'}`,preview(source.slice(p.value.start,p.value.end)),preview(source.slice(winner.value.start,winner.value.end)),false,p.start,p.end);
          }
          visit(p.value,childPath,p.occurrence,live&&!p.overwritten);
        }
      }
    }
    visit(root,'',1,true);report.findings.sort((a,b)=>a.start-b.start||a.code.localeCompare(b.code));
  } catch(error) {
    const e=error instanceof Fault?error:new Fault('native-json-error',error instanceof Error?error.message:'Native JSON parsing failed.',scanner.i);
    report.error={code:e.code,message:e.message,start:Math.min(e.offset,source.length),end:Math.min(e.offset+1,source.length),...loc(Math.min(e.offset,source.length))};
  }
  report.stats={bytes,tokens:scanner.tokens,depth:scanner.depth,numbers:scanner.numbers,duplicates:scanner.duplicates};return report;
}
const escapeHtml=(s:string)=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
export function renderHtmlReport(report:Report):string {
  const e=escapeHtml;const findings=report.findings.map(f=>`<article class="${f.severity}"><small>${e(f.severity.toUpperCase())} · ${e(f.code)} · line ${f.line}:${f.column}</small><h3>${e(f.title)}</h3><p><code>${e(f.pointer||'(root)')}</code> · occurrence ${f.occurrence} · UTF-16 [${f.start}, ${f.end})</p><p>${e(f.message)}</p><div class="compare"><pre>${e(f.before)}</pre><pre>${e(f.after??'(not available)')}</pre></div></article>`).join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>JSONCliff report</title><style>body{font:16px/1.6 system-ui;margin:0;background:#10171e;color:#e6eef4}main{max-width:1100px;margin:40px auto;padding:24px}h1{letter-spacing:-.04em;font-size:40px}small{color:#a9bac8}pre,code{font-family:ui-monospace,monospace}pre{padding:18px;background:#19232d;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere}article{padding:20px;margin:18px 0;border:1px solid #42525e;border-left:4px solid #90a4b8;border-radius:8px}.change{border-left-color:#ffba7a}.risk{border-left-color:#e1e783}.compare{display:grid;grid-template-columns:1fr 1fr;gap:16px}.compare>*{min-width:0}@media(max-width:650px){.compare{grid-template-columns:1fr}main{margin:10px auto;padding:16px}}a{color:#ddea88}</style><main><small>JSONCLIFF / LOCAL DIAGNOSTIC / v${e(report.version)}</small><h1>What changed in the round trip?</h1><p>${report.valid?`${report.findings.filter(f=>f.severity==='change').length} material changes · ${report.findings.filter(f=>f.severity==='risk').length} risks · ${report.findings.filter(f=>f.severity==='info').length} representation changes`:`Invalid input: ${e(report.error?.message||'Unknown error')}`}</p><p>Native JSON.parse → JSON.stringify. This report contains the original input. Review it before sharing.</p><div class="compare"><section><h2>Original JSON</h2><pre>${e(report.source)}</pre></section><section><h2>Native output</h2><pre>${e(report.output||'(No output: invalid or over-limit input)')}</pre></section></div><h2>Evidence</h2>${findings||'<p>No findings.</p>'}<footer>Exact decimal source/output comparison, not a binary floating-point accuracy guarantee. Limits: 1 MiB, depth 128, 60,000 tokens, 20,000 entries, 4,096 characters per number. Schema ${e(report.schemaVersion)}. No scripts or external resources.</footer></main></html>`;
}
/** Encode every UTF-16 code unit so source text cannot become executable code. */
export function createReproducer(source:string):string {
  const encoded=Array.from({length:source.length},(_,i)=>'\\u'+source.charCodeAt(i).toString(16).padStart(4,'0')).join('');
  return `// JSONCliff ${VERSION} native round-trip reproducer. Contains original input.\n// Run: node reproduce.mjs (Node.js 22+)\nconst source = "${encoded}";\ntry {\n  const parsed = JSON.parse(source);\n  process.stdout.write(JSON.stringify(parsed, null, 2) + "\\n");\n} catch (error) {\n  process.stderr.write("Invalid JSON: " + error.message + "\\n");\n  process.exitCode = 2;\n}\n`;
}
