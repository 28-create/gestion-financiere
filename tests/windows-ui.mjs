// Real WebView2/Tauri bridge tests. Runs only on a disposable Windows CI account.
import assert from 'node:assert/strict';
import {mkdir,copyFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {Builder,By,Capabilities,until,Key} from 'selenium-webdriver';
import {translations} from '../src/locales.ts';
import {periodMetrics} from '../src/domain/analysis.ts';
import {budgetUsage} from '../src/domain/features.ts';
if(process.env.RUNNER_ENVIRONMENT!=='github-hosted')throw Error('Disposable Windows CI only');
const root=path.resolve(process.env.RUNNER_TEMP,'finance-ui-'+process.env.GITHUB_RUN_ID),shots=path.resolve('ui-results');await mkdir(root,{recursive:true});await mkdir(shots,{recursive:true});
const application=path.join(root,'gestion-financiere.exe');await copyFile('src-tauri/target/debug/gestion-financiere.exe',application);await writeFile(path.join(root,'portable-mode'),'');
const tauriDriver=spawn(path.join(os.homedir(),'.cargo','bin','tauri-driver.exe'),[],{windowsHide:true,stdio:'inherit'});let driver;
try{
 for(let attempt=0;attempt<100;attempt++){try{const response=await fetch('http://127.0.0.1:4444/status');if(response.ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 const capabilities=new Capabilities();capabilities.setBrowserName('wry');capabilities.set('tauri:options',{application});
 driver=await new Builder().withCapabilities(capabilities).usingServer('http://127.0.0.1:4444/').build();await driver.manage().setTimeouts({script:30000,pageLoad:30000,implicit:0});await driver.wait(until.elementLocated(By.css('h1')),30000);
 await driver.executeScript("window.uiErrors=[];window.addEventListener('error',e=>window.uiErrors.push(e.message));window.addEventListener('unhandledrejection',e=>window.uiErrors.push(String(e.reason)));");
 async function call(command,args={}){const result=await driver.executeAsyncScript(function(command,args,done){window.__TAURI_INTERNALS__.invoke(command,args).then(value=>done({value})).catch(error=>done({error:String(error)}));},command,args);if(result.error)throw Error(result.error);return result.value;}
 const rows=()=>call('report_rows',{from:'0001-01-01',to:'9999-12-31',search:''});
 const input=(changes={})=>({title:'Dépense de contrôle',kind:'expense',status:'realized',occurredOn:'2026-01-31',amountMicros:'100000001',category:'Courses',paymentMethod:'Carte',note:'שלום\nDeux lignes',...changes});
 const save=(value,id=null,revision=null)=>call('save_transaction',{input:value,id,revision});
 const feature=(kind,name,payload)=>call('save_feature',{input:{id:null,revision:null,kind,name,payload,archived:false}});
 const expense=await save(input()),income=await save(input({title:'Salaire de contrôle',kind:'income',amountMicros:'450000000',category:'Salaire'}));assert.equal((await rows()).length,2);
 const project=await feature('project','Projet CI',{color:'#087f78',note:''}),tag=await feature('tag','תגית CI',{color:'#087f78',note:''});
 await call('save_details',{id:expense,revision:1,input:{projectId:project,tags:[tag],currency:'USD',originalMicros:'100000000',rateMicros:'3500000',rateDate:'2026-01-31',rateSource:'Saisie CI',nature:'fixed',necessity:'essential',splits:[{category:'Courses',amountMicros:'200000000'},{category:'Maison',amountMicros:'150000000'}]}});
 const detailed=(await rows()).find(r=>r.id===expense);assert.equal(detailed.amountMicros,'350000000');assert.deepEqual(detailed.tags,[tag]);assert.equal(detailed.splits.length,2);
 const refund=await call('create_refund',{id:expense,revision:2,amountMicros:'50000000',occurredOn:'2026-02-01'});assert.equal((await call('refund_summary',{id:expense})).netMicros,'300000000');
 await assert.rejects(()=>call('set_deleted',{id:expense,revision:2,deleted:true}),/refund/);
 await assert.rejects(()=>save(input({amountMicros:'1000000'}),expense,2),/refund|splits|currency/);
 await call('set_deleted',{id:refund,revision:1,deleted:true});await call('set_deleted',{id:expense,revision:2,deleted:true});await call('set_deleted',{id:expense,revision:3,deleted:false});await call('set_deleted',{id:refund,revision:2,deleted:false});
 const plan=await call('create_installments',{input:{title:'Achat CI',totalMicros:'100000001',count:3,start:'2026-01-31',category:'Maison',paymentMethod:'Carte'}});const installments=await call('installment_rows',{id:plan});assert.deepEqual(installments.map(r=>r.date),['2026-01-31','2026-02-28','2026-03-31']);assert.equal(installments.reduce((n,r)=>n+BigInt(r.amountMicros),0n),100000001n);assert.ok(installments.every(r=>r.status==='planned'));
 assert.deepEqual(periodMetrics(await rows()),{income:450000000n,expense:300000000n,net:150000000n,count:3});
 const budget=await feature('budget','Budget CI',{from:'2026-01-01',to:'2026-12-31',category:'Maison',projectId:null,amountMicros:'200000000'});const features=await call('list_features',{kind:null});assert.equal(budgetUsage(features.find(f=>f.id===budget),await rows()).consumed,150000000n);
 const rule=await feature('recurrence','Série CI',{start:'2026-01-01',frequency:'monthly',calendar:'civil',mode:'manual',kind:'income',interval:1,amountMicros:'1000000',count:3});const item={ruleId:rule,revision:1,scheduledOn:'2026-01-01',occurredOn:'2026-01-01',amountMicros:null,skip:false};assert.equal(await call('record_occurrences',{items:[item]}),1);assert.equal(await call('record_occurrences',{items:[item]}),0);
 const importRows=[1,2].map(n=>({title:'Import légitime identique',kind:'expense',occurredOn:'2026-03-01',amountMicros:'1234567',category:null,paymentMethod:null,note:'שורה\nLigne',sourceKey:'ci-source:'+n,sourceSheet:'CI',sourceTable:'CI',sourceRow:n}));const preview=await call('preview_import_rows',{rows:importRows});const imported=await call('import_rows',{filename:'CI.csv',rows:importRows,catalog:[],keepPossibleDuplicates:false,expectedStamp:preview.stamp});assert.equal(imported.imported,2);const again=await call('import_rows',{filename:'CI.csv',rows:importRows,catalog:[],keepPossibleDuplicates:true,expectedStamp:null});assert.equal(again.imported,0);assert.equal(again.duplicates,2);await call('undo_import',{batchId:imported.batchId});
 await save(input({title:'Salaire corrigé',kind:'income',amountMicros:'450000000',category:'Salaire'}),income,1);await call('restore_revision',{id:income,revision:2,targetRevision:1});assert.equal((await rows()).find(r=>r.id===income).title,'Salaire de contrôle');
 const before=await rows(),backup=await call('create_backup');await save(input({title:'Après sauvegarde'}));await call('restore_backup',{name:path.basename(backup)});assert.deepEqual(await rows(),before);
 await writeFile(path.join(root,'data','backups','ledger-invalid.sqlite3'),'not sqlite');await assert.rejects(()=>call('restore_backup',{name:'ledger-invalid.sqlite3'}));assert.deepEqual(await rows(),before);
 await feature('settings','general',{modules:{budget:true,recurrence:true,project:true,tag:true,template:true,classification:true,installments:true},automationPaused:true,backupFrequency:'off',backupRetention:3,backupFolder:'',cloudFolder:''});
 await driver.navigate().refresh();await driver.executeScript("window.uiErrors=[];window.addEventListener('error',e=>window.uiErrors.push(e.message));window.addEventListener('unhandledrejection',e=>window.uiErrors.push(String(e.reason)));");await driver.wait(until.elementLocated(By.css('.side-nav button[title]')),30000);
 async function nav(label){const button=await driver.findElement(By.css(`.side-nav button[title=${JSON.stringify(label)}]`));await driver.wait(until.elementIsEnabled(button),10000);await button.click();await driver.wait(async()=>(await driver.findElement(By.css('h1')).getText())===label,10000);}
 await nav(translations.fr.expense);await driver.findElement(By.css('.page-title .row-actions .primary')).click();const form=await driver.findElement(By.css('form.editor'));const title=await form.findElement(By.css('input[maxlength="200"]'));await title.sendKeys('Création par interface CI');await form.findElement(By.css('input[inputmode="decimal"]')).sendKeys('2*(3+4)');await form.findElement(By.css('button.primary')).click();await driver.wait(async()=>!(await driver.findElements(By.css('form.editor'))).length,10000);assert.equal((await rows()).find(r=>r.title==='Création par interface CI').amountMicros,'14000000');
 for(const language of ['fr','he','en']){
  const selects=await driver.findElements(By.css('.topbar select'));await selects[0].findElement(By.css(`option[value="${language}"]`)).click();await driver.wait(async()=>await driver.executeScript('return document.documentElement.lang')===language,10000);assert.equal(await driver.executeScript('return document.documentElement.dir'),language==='he'?'rtl':'ltr');
  const dashboardLabel=language==='fr'?'Tableau de bord annuel':language==='he'?'לוח בקרה שנתי':'Annual dashboard';
  const navButtons=await driver.findElements(By.css('.side-nav button[title]'));await navButtons[0].click();await driver.wait(until.elementLocated(By.css('.annual-metrics')),10000);assert.ok((await driver.findElement(By.css('h1')).getText()).length>0);
  for(const theme of ['light','dark']){const themeSelect=(await driver.findElements(By.css('.topbar select')))[1];await themeSelect.findElement(By.css(`option[value="${theme}"]`)).click();await driver.wait(async()=>await driver.executeScript('return document.documentElement.dataset.theme')===theme,10000);await driver.manage().window().setRect({width:1180,height:780});await driver.wait(until.elementLocated(By.css('.chart-host canvas')),10000);await writeFile(path.join(shots,`${language}-${theme}-1180.png`),await driver.takeScreenshot(),'base64');}
 }
 await driver.manage().window().setRect({width:540,height:700});await writeFile(path.join(shots,'compact-540.png'),await driver.takeScreenshot(),'base64');assert.ok(await driver.executeScript('return document.documentElement.scrollWidth<=window.innerWidth+2'));
 assert.deepEqual(await driver.executeScript('return window.uiErrors??[]'),[]);await writeFile(path.join(shots,'result.json'),JSON.stringify({result:'OK',nativeBridge:true,exactAmounts:true,restoreOnDisk:true,duplicateReview:true,languages:['fr','he','en'],themes:['light','dark'],widths:[1180,540],transactions:(await rows()).length},null,2));console.log('Windows native bridge and UI tests passed.');
}catch(error){if(driver)try{await writeFile(path.join(shots,'failure.png'),await driver.takeScreenshot(),'base64');}catch{}throw error;}finally{try{await driver?.quit();}finally{tauriDriver.kill();}}
