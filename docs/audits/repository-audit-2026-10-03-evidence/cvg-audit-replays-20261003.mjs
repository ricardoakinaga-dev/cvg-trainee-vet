import {saveAnswer,submitAttempt} from '/home/ricardo/cvg-trainee-vet/packages/application/dist/index.js';
import {classifyAiError} from '/home/ricardo/cvg-trainee-vet/packages/integrations/dist/ai.js';
const command={attemptId:'synthetic-attempt',participantId:'synthetic-participant',activityId:'synthetic-activity',scopeId:'synthetic-scope',itemId:'synthetic-item',response:'Synthetic answer',idempotencyKey:'synthetic-key',correlationId:'synthetic-correlation',savedAt:'2026-10-03T00:00:00.000Z'};
const fingerprint=JSON.stringify({operation:'save_answer',attemptId:command.attemptId,participantId:command.participantId,activityId:command.activityId,scopeId:command.scopeId,itemId:command.itemId,response:command.response,savedAt:command.savedAt});
const result={attempt:{attemptId:command.attemptId},answer:{itemId:command.itemId}};
const deps={transaction:{run:async fn=>fn({idempotency:{find:async()=>({fingerprint,result})}})}};
async function observe(fn){try{await fn();return 'REPLAY_OK'}catch(e){return e.code??e.name}}
console.log(JSON.stringify({case:'save_answer replay same client operation',sameTimestamp:await observe(()=>saveAnswer(command,deps)),laterServerTimestamp:await observe(()=>saveAnswer({...command,savedAt:'2026-10-03T00:00:01.000Z'},deps))}));
const submitCommand={attemptId:command.attemptId,participantId:command.participantId,scopeId:command.scopeId,idempotencyKey:'synthetic-submit',correlationId:command.correlationId,submittedAt:command.savedAt};
const submitFingerprint=JSON.stringify({operation:'submit_attempt',attemptId:submitCommand.attemptId,participantId:submitCommand.participantId,scopeId:submitCommand.scopeId,submittedAt:submitCommand.submittedAt});
const submitDeps={transaction:{run:async fn=>fn({idempotency:{find:async()=>({fingerprint:submitFingerprint,attempt:result.attempt})}})}};
console.log(JSON.stringify({case:'submit_attempt replay same client operation',sameTimestamp:await observe(()=>submitAttempt(submitCommand,submitDeps)),laterServerTimestamp:await observe(()=>submitAttempt({...submitCommand,submittedAt:'2026-10-03T00:00:01.000Z'},submitDeps))}));
console.log(JSON.stringify({case:'AI classifier error cause named TimeoutError',direct:classifyAiError({name:'TimeoutError'}),wrapped:classifyAiError({name:'AiIntegrationError',cause:{name:'TimeoutError'}})}));
