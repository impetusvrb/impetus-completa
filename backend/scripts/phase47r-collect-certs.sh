#!/usr/bin/env bash
# 47-R — coleta resultados das suítes 39–47 (stdout JSON limpo)
set -uo pipefail
cd "$(dirname "$0")/.."
OUT_DIR="/tmp/impetus_deploy_certs"
mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR"/*.json "$OUT_DIR/summary.json"

run_one() {
  local id="$1" script="$2" use_pass="${3:-}"
  local out="$OUT_DIR/phase${id}.json"
  local err="$OUT_DIR/phase${id}.err"
  echo "[RUN] phase $id — $script" >&2
  local ec=0
  node "scripts/$script" > "$out.raw" 2>"$err" || ec=$?
  node -e "
    const fs=require('fs');
    const raw=fs.readFileSync('$out.raw','utf8');
    const start=raw.indexOf('{');
    const end=raw.lastIndexOf('}');
    let body=null;
    if(start>=0&&end>start){try{body=JSON.parse(raw.slice(start,end+1));}catch(e){}}
    let certified=false,passed=0,failed=0,total=0;
    if(body){
      if('$use_pass'==='pass'&&body.summary){
        passed=body.summary.pass??0; total=body.summary.total??0; failed=total-passed;
        certified=passed===total&&total>0;
      } else if(body.certified!=null){
        certified=body.certified===true;
        passed=body.summary?.passed??0; failed=body.summary?.failed??0; total=body.summary?.total??0;
      }
    }
    fs.writeFileSync('$out', JSON.stringify({phase:'$id',script:'$script',exit_code:$ec,certified,passed,failed,total,parse_ok:body!=null},null,2));
    process.exit($ec===0&&certified?0:1);
  " || return 1
  rm -f "$out.raw"
  return 0
}

FAIL=0
run_one 39 phase39-grounding-revalidation.js pass || FAIL=1
run_one 40 phase40-plc-intelligence-certification.js || FAIL=1
run_one 41 phase41-trend-certification.js || FAIL=1
run_one 42 phase42-anomaly-certification.js || FAIL=1
run_one 43 phase43-correlation-certification.js || FAIL=1
run_one 44 phase44-event-certification.js || FAIL=1
run_one 45 phase45-pattern-certification.js || FAIL=1
run_one 46 phase46-explanation-certification.js || FAIL=1
run_one 47 phase47-priority-certification.js || FAIL=1

node -e "
const fs=require('fs');
const dir='$OUT_DIR';
const results=[];
for(const f of fs.readdirSync(dir).filter(x=>x.startsWith('phase')&&x.endsWith('.json')&&x!=='summary.json')){
  results.push(JSON.parse(fs.readFileSync(dir+'/'+f,'utf8')));
}
results.sort((a,b)=>a.phase.localeCompare(b.phase,undefined,{numeric:true}));
const all=results.every(r=>r.exit_code===0&&r.certified);
fs.writeFileSync(dir+'/summary.json', JSON.stringify({generated_at:new Date().toISOString(),all_certified:all,results},null,2));
console.log(JSON.stringify({all_certified:all,results},null,2));
process.exit(all?0:1);
"
