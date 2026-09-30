import {readdir,readFile} from 'node:fs/promises';import {join} from 'node:path';import {analyze} from '../lib/index.js';
const folder=process.argv[2];if(!folder)throw Error('Usage: node scripts/corpus-check.mjs PATH/JSONTestSuite/test_parsing');
let compared=0,utf8Rejected=0,limitRejected=0;const mismatch=[];
for(const name of (await readdir(folder)).filter(n=>n.endsWith('.json')).sort()){
 const bytes=await readFile(join(folder,name));let s;try{s=new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(bytes);}catch{utf8Rejected++;continue;}
 const report=analyze(s);if(report.error?.code.startsWith('limit-')){limitRejected++;continue;}
 let expected;try{JSON.parse(s);expected=true;}catch{expected=false;}
 compared++;if(report.valid!==expected)mismatch.push({name,expected,actual:report.valid,error:report.error});
}
console.log(JSON.stringify({compared,utf8Rejected,limitRejected,mismatch},null,2));if(mismatch.length)process.exitCode=1;
