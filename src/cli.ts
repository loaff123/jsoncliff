#!/usr/bin/env node
import {createReadStream} from 'node:fs';
import {analyze, createReproducer, renderHtmlReport, LIMITS, VERSION} from './index.js';
const help=`JSONCliff ${VERSION} — inspect the native JSON round trip\nUsage: jsoncliff [file.json|-] [--format text|json|html|repro]\n\nReads UTF-8 from a file or stdin. All formats write to stdout.\nExit 0: no material changes; 1: observed change; 2: invalid/over-limit input or usage/I/O error.\nRisks and representation-only changes do not set exit 1.\nReports and reproducers contain original input. Review before sharing.\nExamples:\n  jsoncliff response.json\n  jsoncliff response.json --format json > report.json\n  jsoncliff response.json --format repro > reproduce.mjs\n`;
const terminalSafe=(s:string)=>s.replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'));
async function main(){
 const args=process.argv.slice(2);let filename='-',format='text',seenFile=false;
 for(let i=0;i<args.length;i++){
   const arg=args[i];
   if(arg==='--help'||arg==='-h'){process.stdout.write(help);return;}
   if(arg==='--version'){process.stdout.write(VERSION+'\n');return;}
   if(arg==='--format'){format=args[++i]||'';if(!['text','json','html','repro'].includes(format))throw Error('--format must be text, json, html, or repro.');}
   else if(arg.startsWith('-')&&arg!=='-')throw Error(`Unknown option: ${arg}`);
   else {if(seenFile)throw Error('Pass one input file or -.');filename=arg;seenFile=true;}
 }
 const stream=filename==='-'?process.stdin:createReadStream(filename);const chunks:Buffer[]=[];let bytes=0;
 for await(const chunk of stream){const b=Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk);bytes+=b.length;if(bytes>LIMITS.bytes){stream.destroy();throw Error(`Input exceeds ${LIMITS.bytes} bytes (1 MiB).`);}chunks.push(b);}
 let source:string;try{source=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(Buffer.concat(chunks));}catch{throw Error('Input is not valid UTF-8. Convert it to UTF-8 before analysis.');}
 const report=analyze(source);
 if(format==='json')process.stdout.write(JSON.stringify(report,null,2)+'\n');
 else if(format==='html')process.stdout.write(renderHtmlReport(report)+'\n');
 else if(format==='repro'){if(!report.valid)throw Error('Cannot export a reproducer for invalid or over-limit input.');process.stdout.write(createReproducer(source));}
 else if(!report.valid)process.stdout.write(`INVALID ${report.error?.code} at ${report.error?.line}:${report.error?.column}: ${terminalSafe(report.error?.message||'')}\n`);
 else {
   const change=report.findings.filter(f=>f.severity==='change').length;
   process.stdout.write(`JSONCliff ${VERSION}: ${change} change(s), ${report.findings.filter(f=>f.severity==='risk').length} risk(s), ${report.findings.filter(f=>f.severity==='info').length} representation change(s)\n`);
   for(const f of report.findings)process.stdout.write(`[${f.severity.toUpperCase()}] ${f.code} ${terminalSafe(JSON.stringify(f.pointer||'(root)'))} occurrence ${f.occurrence} at ${f.line}:${f.column}\n  ${terminalSafe(f.before)} → ${terminalSafe(f.after??'')}\n  ${terminalSafe(f.message)}\n`);
 }
 process.exitCode=report.valid?(report.findings.some(f=>f.severity==='change')?1:0):2;
}
main().catch(error=>{process.stderr.write(`jsoncliff: ${terminalSafe(error instanceof Error?error.message:String(error))}\n`);process.exitCode=2;});
