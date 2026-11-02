import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ArrowDownUp,
  Copy,
  Check,
} from "lucide-react";
/** Accessible modal with keyboard dismissal, focus containment and restoration. */
export function JsonModal({ value, onClose }) {
  const { t } = useTranslation();
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current.focus();
    return () => previous?.focus();
  }, []);
  return (
    <div className="backdrop" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Tab") {
            e.preventDefault();
            ref.current.focus();
          }
        }}
      >
        <header>
          <h2 id="detail-title">{t("Record details")}</h2>
          <button ref={ref} onClick={onClose} aria-label={t("Close")}>
            <X size={18} />
          </button>
        </header>
        <pre>{JSON.stringify(value, null, 2)}</pre>
      </section>
    </div>
  );
}
/** Searchable, sortable, paginated read-only records with JSON inspection. */
export function DataTable({ rows, columns, searchKey }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const [sort, setSort] = useState({ key: columns[0].key, asc: true });
  const [detail, setDetail] = useState(null);
  const filtered = rows
    .filter((row) =>
      String((row[searchKey] ?? "") + " " + (row.status ?? ""))
        .toLowerCase()
        .includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      const x = a[sort.key],
        y = b[sort.key];
      return (
        (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x ?? "").localeCompare(String(y ?? ""))) *
        (sort.asc ? 1 : -1)
      );
    });
  const max = Math.max(0, Math.ceil(filtered.length / size) - 1);
  const current = Math.min(page, max);
  return (
    <>
      <div className="table-tools">
        <input
          aria-label={t("Search records")}
          placeholder={t("Search records")}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <div className="pagination">
          <span>
            {t("Rows")} {filtered.length}
          </span>
          <select
            aria-label={t("Page size")}
            value={size}
            onChange={(e) => {
              setSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {[10, 25, 50].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
          <button
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
            aria-label={t("Previous page")}
          >
            <ChevronLeft size={16} />
          </button>
          <span>
            {current + 1} / {max + 1}
          </span>
          <button
            disabled={current === max}
            onClick={() => setPage(current + 1)}
            aria-label={t("Next page")}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  aria-sort={
                    sort.key === col.key
                      ? sort.asc
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    onClick={() =>
                      setSort({
                        key: col.key,
                        asc: sort.key === col.key ? !sort.asc : true,
                      })
                    }
                  >
                    {t(col.label)}
                    <ArrowDownUp size={12} />
                  </button>
                </th>
              ))}
              <th>{t("Inspect")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered
              .slice(current * size, (current + 1) * size)
              .map((row, i) => (
                <tr
                  key={i}
                  tabIndex={0}
                  onClick={(event) => {
                    if (!event.target.closest("button, input, select, a"))
                      setDetail(row);
                  }}
                  onKeyDown={(event) => {
                    if (
                      event.target === event.currentTarget &&
                      event.key === "Enter"
                    )
                      setDetail(row);
                  }}
                >
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key]}
                    </td>
                  ))}
                  <td>
                    <button onClick={() => setDetail(row)}>
                      {t("View JSON")}
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!filtered.length && <p className="empty">{t("No records found")}</p>}
      </div>
      {detail && <JsonModal value={detail} onClose={() => setDetail(null)} />}
    </>
  );
}
export function CopyButton({ value }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <button
      aria-label={t("Copy")}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}
