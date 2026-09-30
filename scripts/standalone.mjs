import {readFile,writeFile} from 'node:fs/promises';
const root=new URL('../dist/',import.meta.url);let html=await readFile(new URL('index.html',root),'utf8');
const jsPath=html.match(/<script[^>]+src="([^"]+)"[^>]*><\/script>/)?.[1];const cssPath=html.match(/<link[^>]+href="([^"]+\.css)"[^>]*>/)?.[1];
if(!jsPath||!cssPath)throw Error('Build assets not found');
const js=await readFile(new URL(jsPath.replace(/^\//,''),root),'utf8');const css=await readFile(new URL(cssPath.replace(/^\//,''),root),'utf8');
html=html.replace(/<script[^>]+src="[^"]+"[^>]*><\/script>/,()=>`<script>${js.replace(/<\/script/gi,'<\\/script')}</script>`).replace(/<link[^>]+href="[^\"]+\.css"[^>]*>/,()=>`<style>${css}</style>`);
await writeFile(new URL('standalone.html',root),html);console.log('Created a self-contained offline HTML app.');
