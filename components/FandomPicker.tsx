"use client";

import { useMemo, useState } from "react";
import { LEVELS, levelLabel } from "@/lib/themes";

type Fandom = { id: number; name: string; category: string };
type Picked = { fandomId: number; level: number };

const MAX_FANDOMS = 20;

// Pick fandoms with three dropdowns: category, fandom, how big a fan you are.
// The choices are sent with the profile form as hidden "fandoms" fields.
export default function FandomPicker({
  fandoms,
  initial,
}: {
  fandoms: Fandom[];
  initial: Picked[];
}) {
  const [picked, setPicked] = useState<Picked[]>(initial);
  const categories = useMemo(() => Array.from(new Set(fandoms.map((f) => f.category))), [fandoms]);
  const [category, setCategory] = useState(categories[0] ?? "");
  const [fandomId, setFandomId] = useState("");
  const [level, setLevel] = useState("2");

  const byId = useMemo(() => new Map(fandoms.map((f) => [f.id, f])), [fandoms]);
  const pickedIds = new Set(picked.map((p) => p.fandomId));
  const options = fandoms.filter((f) => f.category === category && !pickedIds.has(f.id));
  const full = picked.length >= MAX_FANDOMS;

  function add() {
    const id = Number(fandomId);
    if (!id || pickedIds.has(id) || full) return;
    setPicked([...picked, { fandomId: id, level: Number(level) }]);
    setFandomId("");
  }

  function remove(id: number) {
    setPicked(picked.filter((p) => p.fandomId !== id));
  }

  function changeLevel(id: number, newLevel: number) {
    setPicked(picked.map((p) => (p.fandomId === id ? { ...p, level: newLevel } : p)));
  }

  return (
    <div className="picker">
      <div className="picker-row">
        <label className="field">
          Category
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setFandomId("");
            }}
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Fandom
          <select value={fandomId} onChange={(e) => setFandomId(e.target.value)}>
            <option value="">Choose one…</option>
            {options.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          How big a fan?
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-yellow picker-add" onClick={add} disabled={!fandomId || full}>
          Add
        </button>
      </div>

      {full && <p className="hint">That&rsquo;s the max of {MAX_FANDOMS}. Remove one to add another.</p>}

      {picked.length === 0 ? (
        <p className="hint">No fandoms yet. Add at least a few so we can find your people.</p>
      ) : (
        <ul className="picked">
          {picked.map((p) => {
            const f = byId.get(p.fandomId);
            if (!f) return null;
            return (
              <li key={p.fandomId} className="picked-item">
                <span className="picked-name">{f.name}</span>
                <label className="sr-only" htmlFor={`lvl-${p.fandomId}`}>
                  Fan level for {f.name}
                </label>
                <select
                  id={`lvl-${p.fandomId}`}
                  value={p.level}
                  onChange={(e) => changeLevel(p.fandomId, Number(e.target.value))}
                >
                  {LEVELS.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="picked-remove"
                  onClick={() => remove(p.fandomId)}
                  aria-label={`Remove ${f.name} (${levelLabel(p.level)})`}
                >
                  ×
                </button>
                <input type="hidden" name="fandoms" value={`${p.fandomId}:${p.level}`} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
