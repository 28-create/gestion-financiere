import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState, type FormEvent } from "react";
import { createRoot } from "react-dom/client";
import { decimalAmount, formatIls, parseAmount } from "./domain/money.ts";
import { locales, translations, type Language } from "./locales.ts";
import "./styles.css";

type Kind = "income" | "expense";
type Status = "realized" | "planned" | "pending";
type View = "journal" | Kind | "trash";
type Input = { title: string; kind: Kind; status: Status; occurredOn: string; amountMicros: string };
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
  const [view, setView] = useState<View>("journal");
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
  const t = translations[language];

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
    if (!from || !to || from > to) {
      setData(undefined);
      setLoading(false);
      setReadError("filterError");
      return;
    }
    setLoading(true);
    setReadError(undefined);
    invoke<Page>("read_ledger", {
      from, to, search, page, trash: view === "trash",
      kind: view === "income" || view === "expense" ? view : null,
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

  function openEditor(entry?: Entry) {
    setWriteError(undefined);
    setEditor(entry ? {
      title: entry.title, kind: entry.kind, status: entry.status,
      occurredOn: entry.occurredOn, amount: decimalAmount(BigInt(entry.amountMicros)), saved: entry,
    } : {
      title: "", amount: "", kind: view === "income" ? "income" : "expense",
      status: "realized", occurredOn: day(),
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editor || saving) return;
    let amountMicros: string;
    try {
      amountMicros = parseAmount(editor.amount).toString();
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
      };
      await invoke("save_transaction", {
        input, id: editor.saved?.id ?? null, revision: editor.saved?.revision ?? null,
      });
      setEditor(undefined);
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
        <nav aria-label={t.journal}>
          {(["journal", "income", "expense", "trash"] as const).map((target) => (
            <button key={target} aria-current={view === target ? "page" : undefined} onClick={() => {
              setView(target); setPage(0); setEditor(undefined); setWriteError(undefined);
            }} disabled={saving}>{t[target]}</button>
          ))}
        </nav>
        <div className="page-title">
          <h1>{t[view]}</h1>
          {view !== "trash" && !editor && <button className="primary" onClick={() => openEditor()}>{t.add}</button>}
        </div>
        {editor && (
          <form className="editor surface" onSubmit={save}>
            <h2>{editor.saved ? t.edit : t.add}</h2>
            <div className="fields">
              <label>{t.title}<input autoFocus required maxLength={200} value={editor.title} onChange={(e) => setEditor({ ...editor, title: e.target.value })} /></label>
              <label>{t.amount}<input dir="ltr" required inputMode="decimal" value={editor.amount} onChange={(e) => setEditor({ ...editor, amount: e.target.value })} /></label>
              <label>{t.date}<input required type="date" value={editor.occurredOn} onChange={(e) => setEditor({ ...editor, occurredOn: e.target.value })} /></label>
              <label>{t.kind}<select value={editor.kind} onChange={(e) => setEditor({ ...editor, kind: e.target.value as Kind })}>
                <option value="income">{t.income}</option><option value="expense">{t.expense}</option>
              </select></label>
              <label>{t.status}<select value={editor.status} onChange={(e) => setEditor({ ...editor, status: e.target.value as Status })}>
                <option value="realized">{t.realized}</option><option value="planned">{t.planned}</option><option value="pending">{t.pending}</option>
              </select></label>
            </div>
            <div className="form-actions">
              <button type="button" onClick={() => setEditor({ ...editor, occurredOn: day() })}>{t.today}</button>
              <button type="button" onClick={() => setEditor({ ...editor, occurredOn: day(-1) })}>{t.yesterday}</button>
              <span className="spacer" />
              <button type="button" disabled={saving} onClick={() => { setEditor(undefined); setWriteError(undefined); }}>{t.cancel}</button>
              <button className="primary" disabled={saving}>{t.save}</button>
            </div>
          </form>
        )}
        {writeError && <p className="error" role="alert">{t[writeError]}</p>}
        <div className="filters surface">
          <label>{t.from}<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} /></label>
          <label>{t.to}<input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} /></label>
          <label>{t.search}<input type="search" maxLength={200} value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} /></label>
        </div>
        {visible && view !== "trash" && <section className="totals" aria-label={t.realizedTotals}>
          {([["income", income], ["expense", expense], ["balance", income - expense]] as const).map(([label, value]) => (
            <div className="metric surface" key={label}><span>{t[label]}</span><strong><bdi>{currency(value)}</bdi></strong></div>
          ))}
        </section>}
        {readError && <p className="error" role="alert">{t[readError]}</p>}
        {loading && <p role="status">{t.working}</p>}
        {visible && <section className="surface ledger">
          {visible.entries.length === 0 ? <p className="empty">{t.empty}</p> : <div className="table-scroll">
            <table>
              <thead><tr>{(["date", "title", "kind", "status", "amount", "actions"] as const).map((name) => <th key={name} scope="col">{t[name]}</th>)}</tr></thead>
              <tbody>{visible.entries.map((entry) => <tr key={entry.id}>
                <td><bdi>{entry.occurredOn}</bdi></td><td><bdi>{entry.title}</bdi></td>
                <td>{t[entry.kind]}</td><td><span className={"status " + entry.status}>{t[entry.status]}</span></td>
                <td className="numeric"><bdi>{currency(BigInt(entry.amountMicros))}</bdi></td>
                <td><div className="row-actions">{view === "trash"
                  ? <button disabled={saving || !!editor} onClick={() => void toggleDeleted(entry)}>{t.restore}</button>
                  : <><button disabled={saving || !!editor} onClick={() => openEditor(entry)}>{t.edit}</button>
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
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
