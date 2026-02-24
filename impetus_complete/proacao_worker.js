/**
 * Simple worker example: run once to create alerts for repeated issues
 * Usage: `node proacao_worker.js`
 */
const db = require('./backend/src/db');
async function run(){
  console.log('Worker running'); try{
    const res = await db.query("SELECT location, count(*) as cnt FROM proposals WHERE created_at >= now() - interval '7 days' GROUP BY location HAVING count(*) >= 3");
    for(const row of res.rows){
      await db.query('INSERT INTO alerts(company_id, type, severity, title, description, metadata) VALUES($1,$2,$3,$4,$5,$6)', [null, 'repeat_issue', 'medium', `Repetição em ${row.location}`, `Foram ${row.cnt} registros em 7 dias`, {count: row.cnt}]);
      console.log('Alert for', row.location);
    }
  }catch(e){ console.error(e); } finally { process.exit(0); }
}
run();
