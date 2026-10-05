// Reproducible import of approved study art. No redraw, scaling, or recoloring.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
const [sourceArg,python='python']=process.argv.slice(2);
if(!sourceArg)throw Error('Usage: node scripts/import-yuki.mjs STUDY_DIRECTORY PYTHON');
const source=path.resolve(sourceArg),target=path.resolve('assets/yuki');
const {clipFolders}=await import(pathToFileURL(path.join(source,'clip-folders.mjs')));
await fs.mkdir(target+'/runtime',{recursive:true});await fs.mkdir('.yuki-cache',{recursive:true});
const copied=new Set();
async function copy(name){
 if(copied.has(name))return;copied.add(name);
 if(!/^[a-z-]+\.mjs$/.test(name))throw Error('Unexpected runtime path');
 const content=await fs.readFile(path.join(source,name),'utf8');
 await fs.writeFile(path.join(target,'runtime',name),content);
 for(const m of content.matchAll(/from\s+['"]\.\/([^'"?]+)(?:\?[^'"]*)?['"]/g))await copy(m[1]);
}
for(const name of ['companion.mjs','projection.mjs','idle-renderer.mjs','reply-cues.mjs','timing.mjs','air-reactions.mjs','site-guide.mjs'])await copy(name);
const clips={};for(const [key,folder] of Object.entries(clipFolders))clips[key]={folder,metadata:JSON.parse(await fs.readFile(path.join(source,folder,'frames.json'),'utf8'))};
await fs.writeFile('.yuki-cache/import.json',JSON.stringify({source,target,clips}));
const result=spawnSync(python,['scripts/pack-yuki-art.py','.yuki-cache/import.json'],{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);
console.log(`Imported ${copied.size} tested runtime modules.`);
