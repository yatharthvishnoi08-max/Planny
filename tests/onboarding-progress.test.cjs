const test = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const { randomUUID } = require('node:crypto');
function setup() {
 const storage = new Map();
 const exports = {};
 const code = ts.transpileModule(fs.readFileSync('src/lib/onboardingProgress.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports,crypto:{randomUUID},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}});
 return {api:exports,storage};
}
test('setup progress survives refresh and is isolated by account',()=>{
 const {api}=setup(); const value={step:4,name:'Alex',persona:'Student',wastedHours:'1–2 hours',taskSystem:'Calendar',blockers:['I forget tasks'],planningStyle:'Flexible',taskBehavior:'Estimate the time',routineDrafts:[{id:randomUUID(),title:'Read',time:'21:00'}],planTasks:[{id:randomUUID(),title:'Study',minutes:45}],welcomeId:randomUUID()};
 assert.equal(api.saveOnboardingProgress('a',value),true);
 const restored=api.readOnboardingProgress('a');assert.equal(restored.step,4);assert.equal(restored.name,'Alex');assert.equal(restored.planTasks[0].id,value.planTasks[0].id);assert.equal(restored.routineDrafts[0].title,'Read');assert.equal(restored.welcomeId,value.welcomeId);
 assert.equal(Object.keys(api.readOnboardingProgress('b')).length,0);
 api.clearOnboardingProgress('a');assert.equal(Object.keys(api.readOnboardingProgress('a')).length,0);
});
test('corrupt setup storage falls back safely',()=>{
 const {api,storage}=setup();storage.set('planny_setup:a','broken');assert.equal(Object.keys(api.readOnboardingProgress('a')).length,0);
 storage.set('planny_setup:a',JSON.stringify({version:1,step:12,planTasks:[null],name:42}));const v=api.readOnboardingProgress('a');assert.equal(v.step,undefined);assert.equal(v.name,undefined);assert.equal(v.planTasks.length,0);
});
