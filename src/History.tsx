import { useEffect,useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { formatIls } from './domain/money.ts';
import { translations,locales,type Language } from './locales.ts';
type Revision={revision:number;title:string;kind:'income'|'expense';status:'realized'|'planned'|'pending';occurredOn:string;amountMicros:string;category:string|null;paymentMethod:string|null;note:string|null;deletedAt:string|null;recordedAt:string};
export function History({id,language,onClose}:{id:number;language:Language;onClose:()=>void}){
 const [rows,setRows]=useState<Revision[]>();const [error,setError]=useState(false);const t=translations[language];
 const title=language==='fr'?'Historique des modifications':language==='he'?'היסטוריית שינויים':'Change history';
 useEffect(()=>{let active=true;setRows(undefined);setError(false);invoke<Revision[]>('transaction_history',{id}).then(r=>{if(active)setRows(r);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[id]);
 return <section className="surface history" aria-label={title}><div className="page-title"><h2>{title} · #{id}</h2><button onClick={onClose}>{language==='fr'?'Fermer':language==='he'?'סגירה':'Close'}</button></div>
 {error?<p role="alert">{t.error}</p>:!rows?<p role="status">{t.working}</p>:<div className="table-scroll"><table><thead><tr><th>#</th><th>{t.date} (UTC)</th><th>{t.title}</th><th>{t.date}</th><th>{t.amount}</th><th>{t.status}</th><th>{t.details}</th></tr></thead><tbody>{rows.map(r=><tr key={r.revision}><td>{r.revision}</td><td><bdi>{r.recordedAt}</bdi></td><td><bdi>{r.title}</bdi></td><td>{r.occurredOn}</td><td><bdi>{formatIls(BigInt(r.amountMicros),locales[language])}</bdi></td><td>{t[r.status]}{r.deletedAt&&` · ${t.trash}`}</td><td><bdi>{[t[r.kind],r.category,r.paymentMethod,r.note].filter(Boolean).join(' · ')}</bdi></td></tr>)}</tbody></table></div>}
 </section>;
}
