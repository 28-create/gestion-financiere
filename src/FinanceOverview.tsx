import {useEffect,useMemo,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {annualSummary,comparison,categoryMatrix,percentage,yearRange} from './domain/annual.ts';
import {csvCell,type ReportRow} from './domain/reports.ts';
import {decimalAmount,formatIls} from './domain/money.ts';
import type {CatalogItem} from './domain/catalog.ts';
import {locales,translations,type Language} from './locales.ts';
import {financeCopy} from './financeCopy.ts';
export type OverviewMode='dashboard'|'comparison'|'trends';
function exportCsv(lines:string[][],name:string){const url=URL.createObjectURL(new Blob(['\uFEFF'+lines.map(line=>line.map(csvCell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),5000);}
export function TrendChart({labels,series,language,title}:{labels:string[];series:{name:string;values:bigint[];color:string}[];language:Language;title:string}){
 const values=series.flatMap(s=>s.values);const min=values.reduce((a,b)=>b<a?b:a,0n),max=values.reduce((a,b)=>b>a?b:a,0n),range=max-min||1n;
 const width=Math.max(600,labels.length*65),x=(i:number)=>40+(width-80)*i/Math.max(1,labels.length-1),y=(v:bigint)=>20+Number((max-v)*16000n/range)/100;
 return <div className="surface trend-chart"><p>{series.map(s=><span className="chart-legend" key={s.name}><i style={{background:s.color}}/>{s.name}</span>)}</p><div className="chart-scroll"><svg width={width} height="225" role="img" aria-label={title}><title>{title}</title><line x1="25" x2={width-20} y1={y(0n)} y2={y(0n)} stroke="var(--line)"/>{labels.map((label,i)=><text key={label} x={x(i)} y="210" textAnchor="middle" fill="currentColor" fontSize="11">{label}</text>)}{series.map(s=><g key={s.name}><polyline points={s.values.map((v,i)=>`${x(i)},${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth="2.5"/>{s.values.map((v,i)=><circle key={i} cx={x(i)} cy={y(v)} r="4" fill={s.color}><title>{s.name} · {labels[i]} : {formatIls(v,locales[language])}</title></circle>)}</g>)}</svg></div></div>;
}
export function FinanceOverview({mode,language,version,catalog}:{mode:OverviewMode;language:Language;version:number;catalog:CatalogItem[]}){
 const t=translations[language],w=financeCopy[language];
 const [year,setYear]=useState(new Date().getFullYear());const [start,setStart]=useState(2026);const [end,setEnd]=useState(2040);
 const [kind,setKind]=useState<'income'|'expense'>('expense');const [category,setCategory]=useState('');
 const [savingsCategory,setSavingsCategory]=useState(localStorage.getItem('savings.category')??'Epargne / Livret A');
 const [loaded,setLoaded]=useState<{scope:string;rows:ReportRow[]}>();const [error,setError]=useState(false);const [retry,setRetry]=useState(0);
 const first=mode==='dashboard'?year:start,last=mode==='dashboard'?year:end;
 const scope=JSON.stringify([first,last,version,retry]);
 const rows=loaded?.scope===scope?loaded.rows:undefined;
 let valid=true;try{yearRange(first,last);}catch{valid=false;}
 useEffect(()=>{let active=true;setLoaded(undefined);setError(false);if(!valid)return;
  invoke<ReportRow[]>('report_rows',{from:`${String(first).padStart(4,'0')}-01-01`,to:`${String(last).padStart(4,'0')}-12-31`,search:''}).then(result=>{if(active)setLoaded({scope,rows:result});}).catch(()=>{if(active)setError(true);});
  return()=>{active=false;};
 },[first,last,valid,scope]);
 const annual=useMemo(()=>annualSummary(rows??[],year,savingsCategory),[rows,year,savingsCategory]);
 const years=valid?yearRange(first,last):[];
 const summaries=useMemo(()=>valid?comparison(rows??[],first,last,savingsCategory):[],[rows,first,last,valid,savingsCategory]);
 const known=catalog.filter(c=>c.kind===kind).map(c=>c.name);
 const matrix=useMemo(()=>valid?categoryMatrix(rows??[],first,last,kind,known):[],[rows,first,last,kind,catalog,valid]);
 const selected=matrix.find(c=>c.name===category)??matrix[0];
 const money=(v:bigint)=>formatIls(v,locales[language]);
 const metrics=[{name:t.income,get:(a:typeof annual)=>money(a.income),raw:(a:typeof annual)=>decimalAmount(a.income)},{name:t.expense,get:(a:typeof annual)=>money(a.expense),raw:(a:typeof annual)=>decimalAmount(a.expense)},{name:t.balance,get:(a:typeof annual)=>money(a.net),raw:(a:typeof annual)=>decimalAmount(a.net)},{name:w.current,get:(a:typeof annual)=>money(a.currentExpense),raw:(a:typeof annual)=>decimalAmount(a.currentExpense)},{name:w.savings,get:(a:typeof annual)=>money(a.savings),raw:(a:typeof annual)=>decimalAmount(a.savings)},{name:w.rate,get:(a:typeof annual)=>percentage(a.savings,a.income)??'—',raw:(a:typeof annual)=>percentage(a.savings,a.income)??''},{name:w.incomeCount,get:(a:typeof annual)=>String(a.incomeCount),raw:(a:typeof annual)=>String(a.incomeCount)},{name:w.expenseCount,get:(a:typeof annual)=>String(a.expenseCount),raw:(a:typeof annual)=>String(a.expenseCount)}];
 const savingsNames=Array.from(new Set([savingsCategory,...catalog.filter(c=>c.kind==='expense').map(c=>c.name)]));
 return <section className="overview"><div className="page-title"><h1>{w[mode]}</h1><button className="no-print" onClick={()=>window.print()}>{w.print}</button></div>
 <div className="filters surface no-print">{mode==='dashboard'?<label>{w.year}<input type="number" min="1" max="9999" value={year} onChange={e=>setYear(Number(e.target.value))}/></label>:<><label>{w.start}<input type="number" min="1" max="9999" value={start} onChange={e=>setStart(Number(e.target.value))}/></label><label>{w.end}<input type="number" min="1" max="9999" value={end} onChange={e=>setEnd(Number(e.target.value))}/></label><button onClick={()=>{setStart(2026);setEnd(2040);}}>2026–2040</button></>}
 {mode!=='trends'&&<label>{w.savingsCategory}<select value={savingsCategory} onChange={e=>{setSavingsCategory(e.target.value);localStorage.setItem('savings.category',e.target.value);}}>{savingsNames.map(name=><option key={name} value={name}>{name||w.none}</option>)}</select></label>}
 </div><p>{w.annualHelp}</p><p>{w.flow}</p>
 {!valid?<p role="alert" className="error">{w.badYears}</p>:error?<p role="alert" className="error">{t.error} <button onClick={()=>setRetry(n=>n+1)}>{w.retry}</button></p>:!rows?<p role="status">{t.working}</p>:<>
 {mode==='dashboard'?<>
 <p>{w.year} {year} · {w.rateHelp}</p>{annual.count===0&&<p>{w.emptyYear}</p>}
 <div className="annual-metrics">{metrics.map(metric=><div className="metric surface" key={metric.name}><span>{metric.name}</span><strong><bdi>{metric.get(annual)}</bdi></strong></div>)}</div>
 <TrendChart title={w.months} language={language} labels={annual.months.map(m=>m.name.slice(5))} series={[{name:t.income,color:'#087f78',values:annual.months.map(m=>m.income)},{name:t.expense,color:'#bf5264',values:annual.months.map(m=>m.expense)}]}/>
 <h2>{w.months}</h2><div className="surface table-scroll"><table><thead><tr><th>{t.date}</th><th>{t.income}</th><th>{t.expense}</th><th>{t.balance}</th></tr></thead><tbody>{annual.months.map(m=><tr key={m.name}><td>{m.name}</td><td>{money(m.income)}</td><td>{money(m.expense)}</td><td>{money(m.income-m.expense)}</td></tr>)}</tbody></table></div>
 </>:mode==='comparison'?<>
 <p>{first}–{last} · {w.rateHelp}</p><button className="no-print" onClick={()=>exportCsv([['ILS',...years.map(String)],...metrics.map(m=>[m.name,...summaries.map(m.raw)])],`comparison-${first}-${last}.csv`)}>{w.export}</button>
 <TrendChart title={w.comparison} language={language} labels={years.map(String)} series={[{name:t.income,color:'#087f78',values:summaries.map(a=>a.income)},{name:t.expense,color:'#bf5264',values:summaries.map(a=>a.expense)},{name:t.balance,color:'#7960b2',values:summaries.map(a=>a.net)}]}/>
 <div className="surface comparison-scroll"><table className="comparison-table"><thead><tr><th>{w.year}</th>{years.map(y=><th key={y}>{y}</th>)}</tr></thead><tbody>{metrics.map(metric=><tr key={metric.name}><th scope="row">{metric.name}</th>{summaries.map(a=><td key={a.year}><bdi>{metric.get(a)}</bdi></td>)}</tr>)}</tbody></table></div><p>{w.emptyYear}</p>
 </>:<>
 <div className="filters surface no-print"><label>{t.kind}<select value={kind} onChange={e=>setKind(e.target.value as typeof kind)}><option value="expense">{t.expense}</option><option value="income">{t.income}</option></select></label><label>{w.selected}<select value={selected?.name??''} onChange={e=>setCategory(e.target.value)}>{matrix.map(c=><option key={c.name} value={c.name}>{c.name||w.none}</option>)}</select></label><button disabled={!matrix.length} onClick={()=>exportCsv([[w.category,...years.map(String),w.total],...matrix.map(c=>[c.name||w.none,...c.values.map(decimalAmount),decimalAmount(c.total)])],`categories-${kind}-${first}-${last}.csv`)}>{w.export}</button></div>
 {selected?<TrendChart title={w.trends} language={language} labels={years.map(String)} series={[{name:selected.name||w.none,color:kind==='expense'?'#bf5264':'#087f78',values:selected.values}]}/>:<p>{w.noData}</p>}
 <div className="surface comparison-scroll"><table className="comparison-table"><thead><tr><th>{w.category}</th>{years.map(y=><th key={y}>{y}</th>)}<th>{w.total}</th></tr></thead><tbody>{matrix.map(c=><tr key={c.name}><th scope="row"><button onClick={()=>setCategory(c.name)} aria-pressed={selected?.name===c.name}>{c.name||w.none}</button></th>{c.values.map((v,i)=><td key={i}><bdi>{money(v)}</bdi></td>)}<td><bdi>{money(c.total)}</bdi></td></tr>)}</tbody></table></div>
 </>}
 </>}
 </section>;
}
