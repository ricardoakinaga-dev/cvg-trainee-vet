import { startEmbeddedPostgres, ephemeralPort } from '/home/ricardo/cvg-trainee-vet/scripts/live-embedded-pg.mjs';
import { roleProvisionSql, connectionParts } from '/home/ricardo/cvg-trainee-vet/scripts/provision-ci-postgres.mjs';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root='/home/ricardo/cvg-trainee-vet';
const out=root+'/docs/audits/repository-audit-2026-10-03-evidence';
const require=createRequire(root+'/packages/persistence/package.json');
const postgres=require('postgres');
const env={...process.env, PATH:'/home/ricardo/.nvm/versions/node/v22.23.2/bin:'+process.env.PATH, NO_COLOR:'1', QDRANT_ENABLED:'false',AI_ENABLED:'false',OTEL_TRACES_ENABLED:'false',CVG_RATE_LIMIT_BACKEND:'postgres-shared',NODE_ENV:'test'};
for(const key of Object.keys(env)) if (/^(CVG_TEST_|CVG_REAL_E2E_|DATABASE_URL|CVG_MIGRATION_|AI_API_KEY|QDRANT_API_KEY|EXPECTED_SHA|CVG_MUTATION_CANDIDATE_ID)/.test(key)) delete env[key];
async function command(name,args,environment=env){
 const start=Date.now(); const path=out+'/'+name+'.log';const log=createWriteStream(path);
 const code=await new Promise((resolve,reject)=>{const child=spawn(args[0],args.slice(1),{cwd:root,env:environment,stdio:['ignore','pipe','pipe']});child.stdout.pipe(log,{end:false});child.stderr.pipe(log,{end:false});child.on('error',reject);child.on('close',resolve)});
 await new Promise(resolve=>log.end(resolve));const bytes=await readFile(path);
 const record={name,command:args,exitCode:code,result:code===0?'PASS':'FAIL',durationSeconds:(Date.now()-start)/1000,log:path.slice(root.length+1),sha256:createHash('sha256').update(bytes).digest('hex')};
 await writeFile(out+'/'+name+'.json',JSON.stringify(record,null,2)+'\n'); console.log(JSON.stringify(record));console.log(bytes.toString().slice(-1800));
 if(code!==0) throw new Error(name+' failed with exit '+code);
}
let embedded;
try{
 embedded=await startEmbeddedPostgres(ephemeralPort(56900));
 const cluster=postgres(embedded.maintenanceUrl,{max:1});
 await cluster.unsafe('CREATE DATABASE cvg_audit_20261003');await cluster.end();
 const migrationUrl=embedded.dbUrl('postgres','postgres','cvg_audit_20261003');
 const appUrl=embedded.dbUrl('cvg_audit_app',randomUUID().replaceAll('-',''),'cvg_audit_20261003');
 const adminUrl=embedded.dbUrl('cvg_audit_admin',randomUUID().replaceAll('-',''),'cvg_audit_20261003');
 await command(process.argv.includes('--e2e-only')?'live-fixture-migrations-e2e':'live-fixture-migrations',['pnpm','db:migrate'],{...env,DATABASE_URL:migrationUrl});
 const db=postgres(migrationUrl,{max:1});await db.unsafe(roleProvisionSql({migration:connectionParts('migration',migrationUrl),application:connectionParts('application',appUrl),admin:connectionParts('admin',adminUrl)}));await db.end();
 const testEnv={...env,DATABASE_URL:appUrl,CVG_TEST_DATABASE_URL:appUrl,CVG_TEST_ADMIN_DATABASE_URL:adminUrl,CVG_REAL_E2E_DATABASE_URL:adminUrl,API_HOST:'127.0.0.1',API_PORT:'3101',WEB_ORIGINS:'http://127.0.0.1:3100'};
 if(!process.argv.includes('--e2e-only')) await command('live-postgres-provisioned',['pnpm','test:integration:live'],testEnv);
 await command('real-e2e',['pnpm','test:e2e'],{...testEnv,CVG_RUN_REAL_E2E:'true'});
}finally{if(embedded)await embedded.stop();console.log('Disposable audit cluster cleaned up.');}
