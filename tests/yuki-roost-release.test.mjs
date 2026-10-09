import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gardenDiscoveries,GardenDiscoveries} from '../assets/yuki/home/world-life.mjs';
import {homeLines} from '../assets/yuki/home/home-dialogue.mjs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('release uses the exact approved garden preview and preserves the original artwork',()=>{
 const manifest=JSON.parse(read('assets/yuki/home/roost-artwork.json'));
 const png=readFileSync(new URL('../assets/yuki/home/'+manifest.asset,import.meta.url));
 assert.equal(createHash('sha256').update(png).digest('hex'),manifest.sha256);
 assert.equal(png.readUInt32BE(16),1536);assert.equal(png.readUInt32BE(20),1024);
 assert.match(read('_includes/yuki-home.html'),/petal-nook-roost\.png/);
 const original=readFileSync(new URL('../assets/yuki/home/petal-nook.png',import.meta.url));
 assert.notEqual(createHash('sha256').update(original).digest('hex'),manifest.sha256);
});
test('current garden labels, asides and discovery targets describe the roost and orb in both languages',()=>{
 const template=read('_includes/yuki-home.html');
 assert.match(template,/Dragon Roost/);assert.match(template,/ドラゴンのねぐら/);
 assert.match(template,/crystal orb/);assert.match(template,/水晶玉/);
 assert.doesNotMatch(template,/Leaf Nest|leaf-lined|葉っぱの巣|paper-crane and pebble/);
 assert.equal(gardenDiscoveries.pebble.label[0],'Admire the Crystal Orb');
 assert.deepEqual(gardenDiscoveries.pebble.at,[760,707]);
 assert.match(new GardenDiscoveries().activate('pebble').text,/crystal orb/);
 assert.match(new GardenDiscoveries().activate('pebble',true).text,/水晶玉/);
 const lines=JSON.stringify(homeLines);assert.doesNotMatch(lines,/softest leaf|This pebble|この小石|No treasure hoard/);
});
test('AI setting matches the published artwork without rewriting her early pebble story',()=>{
 const worker=read('services/yuki-api/worker.mjs'),page=read('services/yuki-api/page-answer.mjs'),story=read('services/yuki-api/personality.mjs');
 assert.match(worker,/cozy dragon roost/);assert.match(worker,/crystal orb/);assert.match(worker,/Five distant visitor designs/);
 assert.match(page,/cushioned dragon roost/);assert.match(page,/not real predictions/);
 assert.match(story,/At first she collected shiny pebbles/);assert.match(story,/current garden roost/);
});
