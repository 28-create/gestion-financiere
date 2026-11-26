import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { decimalAmount, formatIls } from "./domain/money.ts";
import { locales, translations, type Language } from "./locales.ts";
import "./styles.css";
import { DataTools } from './DataTools.tsx';
import { Reports } from './Reports.tsx';
import { History } from './History.tsx';
import { evaluateAmount } from './domain/expression.ts';
import { Catalog } from './Catalog.tsx';
import { availableItems,type CatalogItem } from './domain/catalog.ts';
import {FinanceOverview} from './FinanceOverview.tsx';
import {LedgerTable} from './LedgerTable.tsx';
import {financeCopy} from './financeCopy.ts';
import {gridCopy} from './gridCopy.ts';

type Kind = "income" | "expense";
type Status = "realized" | "planned" | "pending";
type View = "journal" | Kind | "trash" | "analysis" | "catalog" | "dashboard" | "comparison" | "trends";
type Details = { category: string | null; paymentMethod: string | null; note: string | null };
type Input = Details & { title: string; kind: Kind; status: Status; occurredOn: string; amountMicros: string };
type Entry = Input & { id: number; revision: number };
type Page = { entries: Entry[]; count: number; incomeMicros: string; expenseMicros: string; pageSize: number };
type Editor = Omit<Input, "amountMicros"> & { amount: string; saved?: Entry };

function day(offset = 0): string {
  const value = new Date();
  value.setDate(value.getDate() + offset);
  return [value.getFullYear(), value.getMonth() + 1, value.getDate()]
    .map((part) => String(part).padStart(2, "0")).join("-");
}

const localLanguage = localStorage.getItem("language");
const defaultLanguage: Language = localLanguage === "en" || localLanguage === "he" ? localLanguage : "fr";

function App() {
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  const [theme, setTheme] = useState(localStorage.getItem("theme") === "dark" ? "dark" : "light");
  const [view, setView] = useState<View>("dashboard");
  const [from, setFrom] = useState(() => day().slice(0, 4) + "-01-01");
  const [to, setTo] = useState(() => day().slice(0, 4) + "-12-31");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [version, setVersion] = useState(0);
  const [data, setData] = useState<Page>();
  const [loading, setLoading] = useState(true);
  const [readError, setReadError] = useState<"filterError" | "error">();
  const [writeError, setWriteError] = useState<"amountError" | "error" | "conflict">();
  const [editor, setEditor] = useState<Editor>();
  const [saving, setSaving] = useState(false);
  const [historyId,setHistoryId]=useState<number>();
  const [catalog,setCatalog]=useState<CatalogItem[]>([]);
  const [titles,setTitles]=useState<string[]>([]);
  const [suggestionError,setSuggestionError]=useState(false);
  const [gridDirty,setGridDirty]=useState(false);
  const t = {...translations[language],dashboard:financeCopy[language].dashboard,comparison:financeCopy[language].comparison,trends:financeCopy[language].trends,analysis:language==='fr'?'Analyses':language==='he'?'ניתוח':'Analysis',catalog:language==='fr'?'Catégories et paiements':language==='he'?'קטגוריות ותשלומים':'Categories and payments'};

  useEffect(()=>{
    let active=true;setSuggestionError(false);
    Promise.all([invoke<CatalogItem[]>('list_catalog'),invoke<string[]>('list_titles')]).then(([items,names])=>{
      if(active){setCatalog(items);setTitles(names);}
    }).catch(()=>{if(active){setSuggestionError(true);setCatalog([]);setTitles([]);}});
    return()=>{active=false;};
  },[version]);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === "he" ? "rtl" : "ltr";
    document.documentElement.dataset.theme = theme;
    document.title = translations[language].app;
    localStorage.setItem("language", language);
    localStorage.setItem("theme", theme);
  }, [language, theme]);

  useEffect(() => {
    let current = true;
    if(view!=='trash')return;
    if (!from || !to || from > to) {
      setData(undefined);
      setLoading(false);
      setReadError("filterError");
      return;
    }
    setLoading(true);
    setReadError(undefined);
    invoke<Page>("read_ledger", {
      from, to, search, page, trash: true,kind: null,
    }).then((result) => {
      if (!current) return;
      const lastPage = Math.max(0, Math.ceil(result.count / result.pageSize) - 1);
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setData(result);
      setLoading(false);
    }).catch(() => {
      if (!current) return;
      setData(undefined);
      setLoading(false);
      setReadError("error");
    });
    return () => { current = false; };
  }, [from, to, search, page, view, version]);

  function openEditor(entry?: Entry, kind: Kind = view === "income" ? "income" : "expense") {
    setWriteError(undefined);
    setEditor(entry ? {
      title: entry.title, kind: entry.kind, status: entry.status,
      occurredOn: entry.occurredOn, amount: decimalAmount(BigInt(entry.amountMicros)), saved: entry,
      category: entry.category, paymentMethod: entry.paymentMethod, note: entry.note,
    } : {
      title: "", amount: "", kind,
      status: "realized", occurredOn: day(), category: null, paymentMethod: null, note: null,
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const continuing=(event.nativeEvent as SubmitEvent).submitter?.getAttribute('data-continue')==='true';
    if (!editor || saving) return;
    let amountMicros: string;
    try {
      amountMicros = evaluateAmount(editor.amount).toString();
    } catch {
      setWriteError("amountError");
      return;
    }
    setSaving(true);
    setWriteError(undefined);
    try {
      const input: Input = {
        title: editor.title, kind: editor.kind, status: editor.status,
        occurredOn: editor.occurredOn, amountMicros,
        category: editor.category || null, paymentMethod: editor.paymentMethod || null, note: editor.note || null,
      };
      await invoke("save_transaction", {
        input, id: editor.saved?.id ?? null, revision: editor.saved?.revision ?? null,
      });
      setEditor(continuing?{...editor,title:'',amount:'',note:null,saved:undefined}:undefined);
      setVersion((previous) => previous + 1);
    } catch (error) {
      setWriteError(error === "conflict" ? "conflict" : "error");
    } finally {
      setSaving(false);
    }
  }

  async function toggleDeleted(entry: Entry) {
    setSaving(true);
    setWriteError(undefined);
    try {
      await invoke("set_deleted", { id: entry.id, revision: entry.revision, deleted: view !== "trash" });
    } catch (error) {
      setWriteError(error === "conflict" ? "conflict" : "error");
    } finally {
      setVersion((previous) => previous + 1);
      setSaving(false);
    }
  }

  const income = BigInt(data?.incomeMicros ?? 0);
  const expense = BigInt(data?.expenseMicros ?? 0);
  const currency = (value: bigint) => formatIls(value, locales[language]);
  const visible = loading ? undefined : data;

  return (
    <div className="app">
      <header className="topbar">
        <strong>{t.app}</strong>
        <div className="settings">
          <select aria-label={t.language} value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
            <option value="fr">Français</option><option value="en">English</option><option value="he">עברית</option>
          </select>
          <select aria-label={t.theme} value={theme} onChange={(event) => setTheme(event.target.value)}>
            <option value="light">{t.light}</option><option value="dark">{t.dark}</option>
          </select>
        </div>
      </header>
      <main>
        <DataTools disabled={saving||gridDirty||Boolean(editor)} onChange={() => setVersion(value => value + 1)} />
        <nav aria-label={t.journal}>
          {(["dashboard", "journal", "income", "expense", "comparison", "trends", "analysis", "catalog", "trash"] as const).map((target) => (
            <button key={target} aria-current={view === target ? "page" : undefined} onClick={() => {
              if(target===view)return;
              if(gridDirty&&!window.confirm(gridCopy[language].discardConfirm))return;
              setGridDirty(false);setHistoryId(undefined);
              setView(target); setPage(0); setEditor(undefined); setWriteError(undefined);
            }} disabled={saving}>{t[target]}</button>
          ))}
        </nav>
        {view==='dashboard'||view==='comparison'||view==='trends'?<FinanceOverview key={view} mode={view} language={language} version={version} catalog={catalog}/>:view==='catalog'?<Catalog language={language} version={version} onChange={()=>setVersion(n=>n+1)}/>:view==='analysis'?<><div className="filters surface"><label>{t.from}<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>{t.to}<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><label>{t.search}<input type="search" value={search} maxLength={200} onChange={e=>setSearch(e.target.value)}/></label></div><Reports from={from} to={to} search={search} version={version} language={language}/></>:<>
        <div className="page-title">
          <h1>{t[view]}</h1>
          {view !== "trash" && !editor && <div className="row-actions">
            {view !== "income" && <button disabled={saving||gridDirty} className="primary" onClick={() => openEditor(undefined, "expense")}>{t.addExpense}</button>}
            {view !== "expense" && <button disabled={saving||gridDirty} className="primary" onClick={() => openEditor(undefined, "income")}>{t.addIncome}</button>}
          </div>}
        </div>
        {editor && (
          <form className="editor surface" onSubmit={save}>
            <h2>{editor.saved ? t.edit : editor.kind === "income" ? t.addIncome : t.addExpense}</h2>
            <div className="fields">
              <label>{t.title}<input autoFocus required list="transaction-titles" maxLength={200} value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} /></label>
              <datalist id="transaction-titles">{titles.map(title=><option value={title} key={title}/>)}</datalist>
              <label>{t.amount}<input dir="ltr" required inputMode="decimal" value={editor.amount} onChange={(e) => setEditor({ ...editor, amount: e.target.value })} /></label>
              <label>{t.date}<input required type="date" value={editor.occurredOn} onChange={(e) => setEditor({ ...editor, occurredOn: e.target.value })} /></label>
              {editor.saved && <label>{t.kind}<select value={editor.kind} onChange={(e) => setEditor({ ...editor, kind: e.target.value as Kind })}>
                <option value="income">{t.income}</option><option value="expense">{t.expense}</option>
              </select></label>}
            </div>
            <div className="classification-fields">
                <label>{t.category}<input list="transaction-categories" value={editor.category ?? ""} onChange={(e) => setEditor({ ...editor, category: e.target.value })} /></label>
                <label>{t.paymentMethod}<input list="transaction-payments" value={editor.paymentMethod ?? ""} onChange={(e) => setEditor({ ...editor, paymentMethod: e.target.value })} /></label>
            </div>
            <datalist id="transaction-categories">{availableItems(catalog,editor.kind).map(item=><option key={item.id} value={item.name}/>)}</datalist>
            <datalist id="transaction-payments">{availableItems(catalog,'payment').map(item=><option key={item.id} value={item.name}/>)}</datalist>
            {suggestionError&&<p role="status">{language==='fr'?'Les suggestions sont indisponibles. La saisie manuelle reste possible.':language==='he'?'ההצעות אינן זמינות. ניתן להזין ערכים ידנית.':'Suggestions are unavailable. You can still enter values manually.'}</p>}
            <details open={Boolean(editor.note || editor.status !== "realized")}>
              <summary>{t.details}</summary>
              <div className="fields">
                <label>{t.status}<select value={editor.status} onChange={(e) => setEditor({ ...editor, status: e.target.value as Status })}>
                  <option value="realized">{t.realized}</option><option value="planned">{t.planned}</option><option value="pending">{t.pending}</option>
                </select></label>
                <label>{t.note}<input value={editor.note ?? ""} onChange={(e) => setEditor({ ...editor, note: e.target.value })} /></label>
              </div>
            </details>
            <div className="form-actions">
              <button type="button" onClick={() => setEditor({ ...editor, occurredOn: day() })}>{t.today}</button>
              <button type="button" onClick={() => setEditor({ ...editor, occurredOn: day(-1) })}>{t.yesterday}</button>
              <span className="spacer" />
              <button type="button" disabled={saving} onClick={() => { setEditor(undefined); setWriteError(undefined); }}>{t.cancel}</button>
              <button className="primary" disabled={saving}>{t.save}</button>
              <button data-continue="true" disabled={saving}>{language==='fr'?'Enregistrer et continuer':language==='he'?'שמירה והמשך':'Save and continue'}</button>
            </div>
          </form>
        )}
        {writeError && <p className="error" role="alert">{t[writeError]}</p>}
        {historyId!==undefined&&<History id={historyId} language={language} onClose={()=>setHistoryId(undefined)}/>}
        <div className="filters surface">
          <label>{t.from}<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} /></label>
          <label>{t.to}<input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} /></label>
          <label>{t.search}<input type="search" maxLength={200} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} /></label>
        </div>
        {view!=='trash'&&<LedgerTable key={view} from={from} to={to} search={search} kind={view==='income'||view==='expense'?view:undefined} language={language} version={version} catalog={catalog} disabled={saving||Boolean(editor)} onChange={()=>setVersion(n=>n+1)} onDirty={setGridDirty} onBusy={setSaving} onHistory={setHistoryId} onEdit={row=>openEditor({...row,revision:row.revision!,kind:row.kind as Kind,status:row.status as Status})}/>}
        {view==='trash'&&readError && <p className="error" role="alert">{t[readError]}</p>}
        {view==='trash'&&loading && <p role="status">{t.working}</p>}
        {view==='trash'&&visible && <section className="surface ledger">
          {visible.entries.length === 0 ? <p className="empty">{t.empty}</p> : <div className="table-scroll">
            <table>
              <thead><tr>{(["date", "title", "kind", "status", "amount", "actions"] as const).map((name) => <th key={name} scope="col">{t[name]}</th>)}</tr></thead>
              <tbody>{visible.entries.map((entry) => <tr key={entry.id}>
                <td><bdi>{entry.occurredOn}</bdi></td><td><bdi>{entry.title}</bdi>
                  {(entry.category || entry.paymentMethod) && <small className="transaction-details">
                    <br /><bdi>{[entry.category, entry.paymentMethod].filter(Boolean).join(" · ")}</bdi>
                  </small>}
                </td>
                <td>{t[entry.kind]}</td><td><span className={"status " + entry.status}>{t[entry.status]}</span></td>
                <td className="numeric"><bdi>{currency(BigInt(entry.amountMicros))}</bdi></td>
                <td><div className="row-actions"><button onClick={()=>setHistoryId(entry.id)}>{language==='fr'?'Historique':language==='he'?'היסטוריה':'History'}</button>{view === "trash"
                  ? <button disabled={saving || !!editor} onClick={() => void toggleDeleted(entry)}>{t.restore}</button>
                  : <><button disabled={saving || !!editor} onClick={() => openEditor(entry)}>{t.edit}</button>
                    <button disabled={saving||!!editor} onClick={()=>{openEditor(entry);setEditor(current=>current?{...current,saved:undefined}:current);}}>{language==='fr'?'Dupliquer':language==='he'?'שכפול':'Duplicate'}</button>
                    <button disabled={saving || !!editor} onClick={() => void toggleDeleted(entry)}>{t.remove}</button></>}
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>}
          <footer className="pager">
            <span>{t.count} · {visible.count}</span>
            <div>
              <button disabled={page === 0} onClick={() => setPage(page - 1)}>{t.previous}</button>
              <button disabled={(page + 1) * visible.pageSize >= visible.count} onClick={() => setPage(page + 1)}>{t.next}</button>
            </div>
          </footer>
        </section>}
        </>}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
