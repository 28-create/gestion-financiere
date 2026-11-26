import { useEffect,useMemo,useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { summarize,transactionsCsv,type ReportRow } from './domain/reports.ts';
import { formatIls } from './domain/money.ts';
import { locales,translations,type Language } from './locales.ts';
const words={
 fr:['Analyses','Par mois','Par catégorie','Par paiement','Par année','Exporter CSV','Afficher le graphique','Sans catégorie / non renseigné','Nombre d’opérations réalisées','Enregistrer ce rapport en PDF','Les opérations prévues et en attente sont exclues des analyses. Le CSV comprend tous les statuts.','Cumul net de la période','Chargement…','Erreur de lecture. Réessayez.','Aucune opération réalisée.'],
 en:['Analysis','By month','By category','By payment','By year','Export CSV','Show chart','Uncategorized / unspecified','Actual transaction count','Save report as PDF','Planned and pending transactions are excluded from analysis. CSV includes all statuses.','Cumulative net flow for period','Loading…','Could not load data. Try again.','No actual transactions.'],
 he:['ניתוח','לפי חודש','לפי קטגוריה','לפי תשלום','לפי שנה','ייצוא CSV','הצגת תרשים','ללא קטגוריה / לא צוין','מספר פעולות שבוצעו','שמירת דוח PDF','פעולות מתוכננות וממתינות אינן נכללות בניתוח. ייצוא CSV כולל את כל הסטטוסים.','תזרים נטו מצטבר בתקופה','טוען…','שגיאה בטעינה. נסו שוב.','אין פעולות שבוצעו.']
};
function download(content:string,filename:string,type:string){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
export function Reports({from,to,search,language,version}:{from:string;to:string;search:string;language:Language;version:number}){
 const [rows,setRows]=useState<ReportRow[]>();const [error,setError]=useState(false);
 const [field,setField]=useState<'month'|'category'|'payment'|'year'>('month');
 const [showChart,setShowChart]=useState(localStorage.getItem('report.chart')!=='false');
 const w=words[language],t=translations[language];const money=(n:bigint)=>formatIls(n,locales[language]);
 useEffect(()=>{let active=true;setRows(undefined);setError(false);if(!from||!to||from>to){setError(true);return;}invoke<ReportRow[]>('report_rows',{from,to,search}).then(r=>{if(active)setRows(r);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[from,to,search,version]);
 const buckets=useMemo(()=>summarize(rows??[],field),[rows,field]);
 const income=buckets.reduce((s,b)=>s+b.income,0n),expense=buckets.reduce((s,b)=>s+b.expense,0n);
 const maximum=buckets.reduce((s,b)=>{const a=b.income<0n?-b.income:b.income,e=b.expense<0n?-b.expense:b.expense;return a>s?(a>e?a:e):e>s?e:s;},1n);
 const width=(n:bigint)=>Number((n<0n?-n:n)*6500n/maximum)/100;
 let cumulative=0n;
 return <section className="reports"><div className="page-title"><h1>{w[0]}</h1><div className="row-actions no-print"><button disabled={!rows} onClick={()=>download(transactionsCsv(rows??[]),`transactions-${from}-${to}.csv`,'text/csv;charset=utf-8')}>{w[5]}</button><button onClick={()=>window.print()}>{w[9]}</button></div></div>
 <p>{from} — {to}{search&&` · ${search}`}</p><p>{w[10]}</p>
 {error?<p className="error" role="alert">{w[13]}</p>:!rows?<p role="status">{w[12]}</p>:<>
 <section className="totals">{[[t.income,money(income)],[t.expense,money(expense)],[t.balance,money(income-expense)]].map(([label,value])=><div className="metric surface" key={label}><span>{label}</span><strong><bdi>{value}</bdi></strong></div>)}</section>
 <p>{w[8]} : {buckets.reduce((s,b)=>s+b.count,0)}</p>
 <div className="filters surface no-print"><select aria-label={w[0]} value={field} onChange={e=>setField(e.target.value as typeof field)}>{(['month','category','payment','year'] as const).map((v,i)=><option value={v} key={v}>{w[i+1]}</option>)}</select><label><input type="checkbox" checked={showChart} onChange={e=>{setShowChart(e.target.checked);localStorage.setItem('report.chart',String(e.target.checked));}}/>{w[6]}</label></div>
 {!buckets.length?<p>{w[14]}</p>:<>
 {showChart&&<div className="surface report-chart"><p><span className="income-dot"/> {t.income} · <span className="expense-dot"/> {t.expense}</p>{buckets.map(b=><div className="chart-group" key={b.name}><strong><bdi>{b.name||w[7]}</bdi></strong><div className="bar-track"><span className="bar income-bar" style={{width:`${width(b.income)}%`}}/><bdi>{money(b.income)}</bdi></div><div className="bar-track"><span className="bar expense-bar" style={{width:`${width(b.expense)}%`}}/><bdi>{money(b.expense)}</bdi></div></div>)}</div>}
 <div className="surface table-scroll"><table><thead><tr><th>{w[(['month','category','payment','year'] as const).indexOf(field)+1]}</th><th>{t.income}</th><th>{t.expense}</th><th>{t.balance}</th>{(field==='month'||field==='year')&&<th>{w[11]}</th>}<th>{t.count}</th></tr></thead><tbody>{buckets.map(b=>{cumulative+=b.income-b.expense;return <tr key={b.name}><td><bdi>{b.name||w[7]}</bdi></td><td><bdi>{money(b.income)}</bdi></td><td><bdi>{money(b.expense)}</bdi></td><td><bdi>{money(b.income-b.expense)}</bdi></td>{(field==='month'||field==='year')&&<td><bdi>{money(cumulative)}</bdi></td>}<td>{b.count}</td></tr>;})}</tbody></table></div></>}
 </>}
 </section>;
}
