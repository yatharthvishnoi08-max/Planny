const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
function setup() {
 const storage = new Map();
 const exports = {};
 const code = ts.transpileModule(fs.readFileSync('src/lib/planDraft.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,crypto:{randomUUID},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
 return {api:exports,storage};
}
test('edited starting plans retain individual titles, estimates and stable IDs across reload',()=>{
 const {api}=setup(); const tasks=api.draftTasks('Physics, project, workout');
 tasks[1].title='Ship my prototype';tasks[1].minutes=75;
 api.savePlanDraft({version:1,problem:'Too much to do',tasks});
 const restored=api.readPlanDraft();
 assert.equal(restored.tasks.length,3);assert.equal(restored.tasks[1].minutes,75);assert.equal(restored.tasks[1].title,'Ship my prototype');assert.equal(restored.tasks[1].id,tasks[1].id);
 api.clearPlanDraft();assert.equal(api.readPlanDraft(),null);
});
test('legacy raw drafts migrate and corrupt stored data does not crash onboarding',()=>{
 const {api,storage}=setup();storage.set('planny_landing_draft','Study physics, finish project');assert.equal(api.readPlanDraft().tasks.length,2);
 storage.set('planny_landing_draft',JSON.stringify({version:1,tasks:[null,{id:'bad',title:'Bad',minutes:-5}]}));assert.equal(api.readPlanDraft(),null);
});
test('draft validation rejects empty titles and invalid time estimates',()=>{
 const {api}=setup();assert.equal(api.validDraft([]),false);
 for(const minutes of [0,-1,481,NaN,10.5]) assert.equal(api.validDraft([{id:'1',title:'Study',minutes}]),false);
 assert.equal(api.validDraft([{id:'1',title:' ',minutes:30}]),false);
 assert.equal(api.validDraft([{id:'1',title:'Study',minutes:45}]),true);
});
