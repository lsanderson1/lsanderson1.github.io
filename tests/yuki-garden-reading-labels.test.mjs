import test from 'node:test';
import assert from 'node:assert/strict';
import {readingLabels} from '../assets/yuki/runtime/reading-context.mjs';

test('garden has its own descriptive localized label and no visible in-view line',()=>{
 const section={level:0,kind:'image',title:'The whole garden image'};
 assert.deepEqual(readingLabels({title:'Yuki',section,garden:true}),{page:'On this page: Yuki’s Garden — My Cozy Home Among the Blossoms',view:''});
 assert.deepEqual(readingLabels({title:'Yuki',section,garden:true,lang:'ja'}),{page:'現在のページ：「ゆきの庭」— 桜に囲まれた、わたしのおうち',view:''});
 assert.equal(section.title,'The whole garden image');
});

test('ordinary portfolio pages keep their dynamic page and section labels',()=>{
 assert.deepEqual(readingLabels({title:'Resume',section:{level:2,title:'Experience'}}),{page:'On this page: Resume',view:'In view: Experience'});
 assert.deepEqual(readingLabels({title:'履歴',lang:'ja',section:{level:2,title:'職歴'}}),{page:'現在のページ：履歴',view:'表示中：職歴'});
 assert.equal(readingLabels({title:'Resume',section:{level:1,title:'Resume'}}).view,'');
});
