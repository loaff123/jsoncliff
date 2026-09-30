import {spawnSync} from 'node:child_process';import {mkdtempSync,readFileSync,writeFileSync,rmSync,mkdirSync} from 'node:fs';import {tmpdir} from 'node:os';import {join,resolve} from 'node:path';import assert from 'node:assert/strict';
const npm=process.platform==='win32'?'npm.cmd':'npm',base=resolve('.'),dir=mkdtempSync(join(tmpdir(),'jsoncliff-package-'));
function run(command,args,options={}){const r=spawnSync(command,args,{cwd:dir,encoding:'utf8',env:{...process.env,npm_config_cache:join(dir,'cache')},shell:process.platform==='win32',...options});if(r.error)throw r.error;return r;}
try{
 const pack=run(npm,['pack','--json','--ignore-scripts','--pack-destination',dir],{cwd:base});assert.equal(pack.status,0,pack.stderr);const info=JSON.parse(pack.stdout)[0];const tar=join(dir,info.filename);
 writeFileSync(join(dir,'package.json'),'{"private":true,"type":"module"}');
 const install=run(npm,['install','--offline','--ignore-scripts','--no-audit','--no-fund',tar]);assert.equal(install.status,0,install.stderr);
 const cli=join(dir,'node_modules/jsoncliff/lib/cli.js');const result=run(process.execPath,[cli,'--format','json'],{input:'{"id":9007199254740993}'});assert.equal(result.status,1);assert.equal(JSON.parse(result.stdout).findings[0].code,'precision-loss');
 const bin=join(dir,'node_modules/.bin',process.platform==='win32'?'jsoncliff.cmd':'jsoncliff');const help=run(bin,['--help']);assert.equal(help.status,0,help.stderr);
 writeFileSync(join(dir,'import.mjs'),"import {analyze} from 'jsoncliff'; if(analyze('0.1').findings.length)process.exit(1); console.log('Core import works');");assert.equal(run(process.execPath,['import.mjs']).status,0);
 mkdirSync(join(base,'release'),{recursive:true});const {copyFileSync}=await import('node:fs');copyFileSync(tar,join(base,'release',info.filename));
 console.log(`PASS: npm tarball installs offline; installed CLI, executable bin, and ESM core import work (${info.filename}, ${info.size} bytes).`);
}finally{rmSync(dir,{recursive:true,force:true});}
