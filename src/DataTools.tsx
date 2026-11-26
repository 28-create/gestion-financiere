import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { readWorkbook, type Preview } from './domain/workbook.ts';
import { formatIls } from './domain/money.ts';
export function DataTools({onChange,disabled=false}:{onChange:()=>void;disabled?:boolean}) {
 const [preview,setPreview]=useState<Preview>();const [filename,setFilename]=useState('');
 const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
 const [batch,setBatch]=useState<number>();
 const [backups,setBackups]=useState<string[]>([]);const [selected,setSelected]=useState('');
 const totals=(kind:string)=>(preview?.rows??[]).filter(r=>r.kind===kind).reduce((n,r)=>n+BigInt(r.amountMicros),0n);
 async function run(action:()=>Promise<void>){setBusy(true);setMessage('');try{await action();}catch(e){setMessage(String(e));}finally{setBusy(false);}}
 return <fieldset disabled={disabled} className="data-tools-lock"><details className="surface data-tools"><summary>Import Excel et sauvegarde</summary>
 <p>Choisissez le classeur Budget original. Vérifiez l’aperçu puis confirmez l’import. Une sauvegarde locale est créée avant chaque import.</p>
 <label>Classeur Excel <input type="file" accept=".xlsx" disabled={busy} onChange={event=>{const file=event.target.files?.[0];if(file)void run(async()=>{setPreview(undefined);setFilename(file.name);setPreview(await readWorkbook(file));});event.target.value='';}}/></label>
 {preview&&<><p>{filename} : {preview.rows.length} opérations. Revenus : {formatIls(totals('income'),'fr-FR')} · Dépenses : {formatIls(totals('expense'),'fr-FR')}</p>
 <p>Listes complètes : {preview.catalog.filter(c=>c.kind==='income').length} catégories de revenus, {preview.catalog.filter(c=>c.kind==='expense').length} catégories de dépenses et {preview.catalog.filter(c=>c.kind==='payment').length} moyens de paiement, même sans opération associée.</p>
 {preview.catalogIssues.length>0&&<p role="alert">{preview.catalogIssues.join(' · ')}</p>}
 <details><summary>Vérifier les listes</summary>{(['income','expense','payment'] as const).map(kind=><p key={kind}><strong>{kind==='income'?'Revenus':kind==='expense'?'Dépenses':'Paiements'} : </strong>{preview.catalog.filter(c=>c.kind===kind).map(c=>c.name).join(' · ')}</p>)}</details>
 <button disabled={busy||preview.catalogIssues.length>0||!preview.catalog.length} onClick={()=>void run(async()=>{const count=await invoke<number>('import_catalog',{items:preview.catalog});setMessage(`${count} nouveaux éléments de liste importés. Les valeurs existantes et leur archivage sont conservés.`);onChange();})}>Importer uniquement les listes</button>
 <p>Les lignes identiques à une opération déjà présente (titre, type, date, montant, catégorie, paiement et note) seront ignorées. Deux opérations légitimes identiques seront aussi considérées comme doublons : vérifiez votre fichier avant de confirmer.</p>
 {preview.issues.length>0?<div role="alert"><p>L’import est bloqué jusqu’à correction des {preview.issues.length} anomalies.</p><ul>{preview.issues.slice(0,100).map((s,i)=><li key={i}>{s}</li>)}</ul></div>:null}
 <div className="table-scroll"><table><thead><tr><th>Date</th><th>Titre</th><th>Type</th><th>Montant</th><th>Catégorie</th></tr></thead><tbody>{preview.rows.slice(0,100).map((r,i)=><tr key={i}><td>{r.occurredOn}</td><td><bdi>{r.title}</bdi></td><td>{r.kind==='income'?'Revenu':'Dépense'}</td><td>{formatIls(BigInt(r.amountMicros),'fr-FR')}</td><td><bdi>{r.category}</bdi></td></tr>)}</tbody></table></div><p>Aperçu limité aux 100 premières lignes.</p>
 <button disabled={busy||preview.issues.length>0||preview.catalogIssues.length>0||!preview.rows.length} onClick={()=>void run(async()=>{const result=await invoke<{batchId:number;imported:number;duplicates:number;catalogImported:number}>('import_rows',{filename,rows:preview.rows,catalog:preview.catalog});setBatch(result.batchId);setMessage(`${result.imported} opérations importées ; ${result.duplicates} doublons ignorés ; ${result.catalogImported} nouveaux éléments de liste.`);setPreview(undefined);onChange();})}>Confirmer l’import</button></>}
 <button disabled={busy} onClick={()=>void run(async()=>setMessage(`Sauvegarde vérifiée : ${await invoke<string>('create_backup')}`))}>Créer une sauvegarde</button>
 {batch!==undefined&&<button disabled={busy} onClick={()=>{if(window.confirm('Mettre à la corbeille les opérations de ce lot ?'))void run(async()=>{await invoke('undo_import',{batchId:batch});setBatch(undefined);setMessage('Lot annulé. Les opérations sont dans la corbeille.');onChange();});}}>Annuler le dernier lot importé</button>}
 <details><summary>Restaurer une sauvegarde locale</summary><p>La restauration remplace le registre actuel. Une copie de sécurité de l’état actuel est conservée avant le remplacement.</p><button disabled={busy} onClick={()=>void run(async()=>{const names=await invoke<string[]>('list_backups');setBackups(names);setSelected(names[0]??'');if(!names.length)setMessage('Aucune sauvegarde disponible.');})}>Rechercher les sauvegardes</button>{backups.length>0&&<><label>Sauvegarde<select value={selected} onChange={e=>setSelected(e.target.value)}>{backups.map(name=><option key={name}>{name}</option>)}</select></label><button disabled={busy||!selected} onClick={()=>{if(window.confirm('Remplacer les données actuelles par cette sauvegarde ?'))void run(async()=>{const safety=await invoke<string>('restore_backup',{name:selected});setBatch(undefined);setPreview(undefined);setMessage(`Restauration terminée. Copie de sécurité : ${safety}`);onChange();});}}>Restaurer cette sauvegarde</button></>}</details>
 {busy&&<p role="status">Traitement en cours…</p>}{message&&<p role="status">{message}</p>}
 </details></fieldset>;
}
