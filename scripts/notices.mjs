import {readFile,readdir,mkdir,writeFile,copyFile} from 'node:fs/promises';import {join} from 'node:path';
const lock=JSON.parse(await readFile('package-lock.json','utf8'));await mkdir('docs/licenses',{recursive:true});let out='# Third-party notices\n\nJSONCliff core and browser app have zero third-party runtime dependencies. The following locked packages are build/test tools (including optional platform packages). Their license identifiers come from the lockfile. Full available installed-package license texts are in `docs/licenses/`. JSONTestSuite is used externally for validation and is not redistributed.\n\n| Package | Version | License |\n|---|---|---|\n';
for(const [path,p] of Object.entries(lock.packages).sort()){
 if(!path)continue;const name=path.split('node_modules/').at(-1);out+=`| ${name} | ${p.version} | ${p.license||'See upstream package'} |\n`;
 let files;try{files=await readdir(path);}catch{continue;}
 for(const file of files.filter(f=>/^licen[cs]e(?:[.\-_]|$)|^copying(?:[.\-_]|$)|^notice(?:[.\-_]|$)/i.test(f))){try{await copyFile(join(path,file),join('docs/licenses',name.replace(/[\/@]/g,'_')+'-'+file));}catch{}}
}
await writeFile('THIRD_PARTY_NOTICES.md',out);console.log('Wrote toolchain inventory and installed license texts.');
