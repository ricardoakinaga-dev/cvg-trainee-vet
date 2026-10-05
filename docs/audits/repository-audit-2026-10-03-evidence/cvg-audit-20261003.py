from pathlib import Path
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor
import hashlib, json, os, subprocess, time

ROOT = Path('/home/ricardo/cvg-trainee-vet')
OUT = ROOT / 'docs/audits/repository-audit-2026-10-03-evidence'
OUT.mkdir(exist_ok=True)
ENV = os.environ.copy()
ENV['PATH'] = '/home/ricardo/.nvm/versions/node/v22.23.2/bin:' + ENV['PATH']
for key in list(ENV):
    if key in ['DATABASE_URL','REDIS_URL','QDRANT_URL','CVG_TEST_DATABASE_URL','CVG_TEST_ADMIN_DATABASE_URL','CVG_TEST_REDIS_URL','CVG_MUTATION_CANDIDATE_ID','EXPECTED_SHA','CVG_RUN_REAL_E2E','CVG_STAGING_EXTERNAL']:
        ENV.pop(key, None)
ENV['NO_COLOR'] = '1'

def run(name, args, timeout=300):
    started = datetime.now(timezone.utc).isoformat(); t = time.monotonic()
    with (OUT / (name + '.log')).open('w') as log:
        try:
            p = subprocess.run(args, cwd=ROOT, env=ENV, stdout=log, stderr=subprocess.STDOUT, timeout=timeout)
            code = p.returncode
        except subprocess.TimeoutExpired:
            code = 124
            log.write('\nAUDIT_TIMEOUT\n')
    data = (OUT / (name + '.log')).read_bytes()
    record = dict(name=name, command=args, startedAt=started, durationSeconds=round(time.monotonic()-t,2), exitCode=code, result='PASS' if code==0 else 'FAIL', log=str((OUT/(name+'.log')).relative_to(ROOT)), sha256=hashlib.sha256(data).hexdigest())
    (OUT / (name + '.json')).write_text(json.dumps(record, indent=2)+'\n')
    print(json.dumps(record), flush=True)
    print(data.decode(errors='replace')[-1600:], flush=True)
    return record

if __name__ == '__main__':
    import sys
    mode = sys.argv[1]
    if mode == 'inventory':
        records=[]
        for p in sorted((ROOT/'docs').rglob('*')):
            if p.is_file() and OUT not in p.parents:
                b=p.read_bytes(); s=b.decode('utf-8')
                records.append(dict(path=str(p.relative_to(ROOT)),bytes=len(b),lines=len(s.splitlines()),sha256=hashlib.sha256(b).hexdigest()))
        status = subprocess.check_output(['git','status','--short'],cwd=ROOT,text=True)
        (OUT/'initial-git-status.txt').write_text(status)
        (OUT/'docs-inventory.json').write_text(json.dumps(dict(generatedAt=datetime.now(timezone.utc).isoformat(),head=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip(),files=len(records),bytes=sum(r['bytes'] for r in records),lines=sum(r['lines'] for r in records),inventory=records),indent=2)+'\n')
        print(len(records),sum(r['bytes'] for r in records),sum(r['lines'] for r in records))
    elif mode == 'gates':
        names=['format:check','lint','typecheck','verify:ci-contract','verify:secrets','verify:traceability','verify:traceability:release','verify:documentation','verify:migrations','verify:product-definition','verify:exposure','verify:routes','verify:complexity','verify:cycles','verify:dead-code','verify:release-evidence','verify:audit-consistency','verify:aaa-candidate','verify:triple-aaa']
        with ThreadPoolExecutor(max_workers=3) as pool:
            list(pool.map(lambda n:run(n.replace(':','-'),['pnpm',n]),names))
        run('dependency-audit',['pnpm','audit','--json'],120)
        run('diff-check',['git','diff','--check'])
    elif mode == 'coverage':
        run('coverage',['pnpm','test:coverage'],600)
        run('coverage-floor',['pnpm','verify:coverage-floor'])
        run('evidence-consistency',['pnpm','verify:evidence-consistency'])
    elif mode == 'live':
        run('live-postgres',['pnpm','test:integration:live'],600)
        run('live-rls',['pnpm','test:rls:live'],400)
        run('restore-migrations',['pnpm','verify:restore-migrations'],400)
        run('live-ratelimit',['pnpm','test:ratelimit:live'],300)
    elif mode == 'e2e':
        ENV['CVG_RUN_REAL_E2E']='true'
        run('real-e2e',['pnpm','test:e2e'],600)
