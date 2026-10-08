// Source allowlist only. Generated metadata contains no source body or secrets.
// --refresh is an explicit editorial step AFTER reviewing changed source.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const root=path.resolve(import.meta.dirname,'..');
const specs=JSON.parse(fs.readFileSync(path.join(root,'services/yuki-api/making-blocks.json'),'utf8'));
const output=path.join(root,'services/yuki-api/making-verified.json');
const result=specs.map(({file,start,until,...note})=>{
 assert(/^(?:assets\/yuki\/(?:runtime|home)\/[a-z-]+\.mjs|services\/yuki-api\/(?:knowledge|worker|reply-completion)\.mjs|scripts\/pack-yuki-art\.py)$/.test(file),'Source is not allowlisted');
 const source=fs.readFileSync(path.join(root,file),'utf8').replace(/\r\n/g,'\n'),begin=source.indexOf(start);
 assert(begin>=0&&source.indexOf(start,begin+start.length)<0,'Missing or ambiguous block: '+note.id);
 const end=until?source.indexOf(until,begin+start.length):source.length;
 assert(end>begin,'Missing end anchor: '+note.id);
 const text=source.slice(begin,end).trimEnd();
 return {...note,source:{file,symbol:note.symbol,firstLine:source.slice(0,begin).split('\n').length,lastLine:source.slice(0,begin+text.length).split('\n').length,sha256:createHash('sha256').update(text).digest('hex')}};
});
if(process.argv.includes('--refresh'))fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');
else assert.deepEqual(JSON.parse(fs.readFileSync(output,'utf8')),result,'Implementation changed: review the explanation before refreshing its source fingerprint.');
console.log('Verified '+result.length+' source-mapped making-of blocks; no source text exported.');
