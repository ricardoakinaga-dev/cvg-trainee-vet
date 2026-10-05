import {getModuleDraftPack,evaluateModuleAttempt} from '/home/ricardo/cvg-trainee-vet/packages/curriculum/dist/index.js';
import {createIntegrationHandlers} from '/home/ricardo/cvg-trainee-vet/apps/worker/dist/handlers.js';
import {advanceContent} from '/home/ricardo/cvg-trainee-vet/packages/application/dist/index.js';
const pack=getModuleDraftPack('M02');
const result=evaluateModuleAttempt({moduleId:'M02',mode:'FORMATIVE_CHOICE',completedAt:'2026-10-03T00:00:00.000Z',answers:pack.items.filter(i=>i.responseMode==='CHOICE').map(i=>({itemId:i.id,selectedChoiceIds:i.correctChoiceIds}))});
console.log(JSON.stringify({case:'formative quiz with required open answers absent',openItemsNotAnswered:pack.items.filter(i=>i.responseMode==='TEXT').length,status:result.status,openItemsRequiringReview:result.openResponseItemIds.length,retentionDays:result.retentionReviews.map(r=>r.day)}));
let unblockEmbedding;const heldEmbedding=new Promise(resolve=>unblockEmbedding=resolve);let sourceRead;const sourceReadSignal=new Promise(resolve=>sourceRead=resolve);const actions=[];
const handlers=createIntegrationHandlers({source:{findPublishedIndexable:async()=>{sourceRead();return {contentId:'synthetic-content',version:1,scopeId:'synthetic-scope',text:'Synthetic index text'}}},embedding:{embed:async()=>heldEmbedding},vectorStore:{upsert:async()=>actions.push('upsert'),delete:async()=>actions.push('delete')}});
const event={payload:{content_id:'synthetic-content',version:'1'}};
const publish=handlers['content.published.v1'](event);await sourceReadSignal;
await handlers['content.withdrawn.v1'](event);unblockEmbedding([[1,0]]);await publish;
console.log(JSON.stringify({case:'withdraw while embedding a published item',adapterActions:actions,lastAction:actions.at(-1),realQdrantUsed:false}));
const conflict=new Error('synthetic concurrent change');conflict.name='PersistenceConflictError';
try{await advanceContent({principalId:'synthetic-author',accountStatus:'ACTIVE',roles:['AUTHOR'],scopes:['synthetic-scope'],contentId:'synthetic-content',version:1,scopeId:'synthetic-scope',event:'AUTOVERIFICAR',correlationId:'synthetic-correlation'},{idFactory:()=> 'synthetic-event',transaction:{run:async fn=>fn({content:{find:async()=>({contentId:'synthetic-content',version:1,scopeId:'synthetic-scope',status:'RASCUNHO'}),save:async()=>{throw conflict}}})}})}catch(e){console.log(JSON.stringify({case:'content persistence concurrency error',mappedCode:e.code,httpStatus:e.status}))}
