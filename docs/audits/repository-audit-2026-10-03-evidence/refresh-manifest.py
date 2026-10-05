from pathlib import Path
from datetime import datetime, timezone
import hashlib, json, subprocess

root = Path('/home/ricardo/cvg-trainee-vet')
out = root / 'docs/audits/repository-audit-2026-10-03-evidence'
path = out / 'audit-manifest.json'
manifest = json.loads(path.read_text())
prior = {c['name']: c.get('assessment', c['result']) for c in manifest['checks']}
checks = []
for p in sorted(out.glob('*.json')):
    record = json.loads(p.read_text())
    if isinstance(record, dict) and all(k in record for k in ('command', 'exitCode', 'name', 'log', 'sha256')):
        record['assessment'] = prior.get(record['name'], record['result'])
        assert hashlib.sha256((root / record['log']).read_bytes()).hexdigest() == record['sha256']
        checks.append(record)
manifest['checks'] = checks
manifest['generatedAt'] = datetime.now(timezone.utc).isoformat()
manifest['report']['sha256'] = hashlib.sha256((root / manifest['report']['path']).read_bytes()).hexdigest()

def fingerprint(p):
    data = p.read_bytes()
    return {'path': str(p.relative_to(root)), 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}

manifest['controlRecords'] = [fingerprint(root / p) for p in ('docs/99_runtime_state.md', 'docs/20_master_execution_log.md', 'docs/30_backlog_master.md', 'traceability.yml')]
listed = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root).decode().split('\0')
runtime = []
for name in sorted(set(listed) - {''}):
    p = root / name
    if p.is_file() and (name.split('/')[0] in {'apps', 'packages', 'scripts', 'config', '.github', 'tests'} or '/' not in name):
        runtime.append(fingerprint(p))
manifest['auditedWorktree'] = {
    'capturedAt': manifest['generatedAt'],
    'method': 'current Git tracked and nonignored untracked files in apps/packages/scripts/config/.github/tests and root; SHA-256 of ordered path/size/content hashes; no claim of remote certification',
    'digest': hashlib.sha256(json.dumps(runtime, sort_keys=True, separators=(',', ':')).encode()).hexdigest(),
    'files': runtime,
}
manifest['artifacts'] = [fingerprint(p) for p in sorted(out.rglob('*')) if p.is_file() and p != path]
assert len(manifest['scores']) == 51
assert all(0 <= s['score'] <= 100 for s in manifest['scores'])
assert len(manifest['readingCoverage']) == 85
path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n')
print(json.dumps({'checks': len(checks), 'artifacts': len(manifest['artifacts']), 'initialDocsRead': len(manifest['readingCoverage']), 'scores': len(manifest['scores']), 'runtimeFilesFingerprinted': len(runtime), 'reportSha256': manifest['report']['sha256']}, indent=2))
