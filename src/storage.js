import { useEffect, useRef, useState } from "react";
import { normalizeDataset } from "./data";

const apiEndpoint = "/api/database";

export function usePersistentState(key, initialValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === "undefined") return initialValue;

    try {
      const stored = window.localStorage.getItem(key);
      return stored ? normalizeDataset(JSON.parse(stored)) : initialValue;
    } catch {
      return initialValue;
    }
  });
  const [state, setState] = useState({
    source: "loading",
    label: "Carregando SQLite",
    error: "",
  });
  const readyToPersist = useRef(false);
  const saveTimer = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function loadFromSqlite() {
      try {
        const response = await fetch(apiEndpoint, { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const payload = normalizeDataset(await response.json());
        if (cancelled) return;
        setValue(payload);
        readyToPersist.current = true;
        persistBrowserBackup(key, payload);
        setState({ source: "sqlite", label: "SQLite local", error: "" });
      } catch (error) {
        if (cancelled) return;
        readyToPersist.current = true;
        setState({
          source: "browser",
          label: "Offline no navegador",
          error: error.message || "API SQLite indisponivel",
        });
      }
    }

    loadFromSqlite();

    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    persistBrowserBackup(key, value);

    if (!readyToPersist.current || typeof window === "undefined") return;

    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      try {
        const response = await fetch(apiEndpoint, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(value),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setState({ source: "sqlite", label: "SQLite local", error: "" });
      } catch (error) {
        setState({
          source: "browser",
          label: "Offline no navegador",
          error: error.message || "Nao foi possivel salvar no SQLite",
        });
      }
    }, 350);

    return () => window.clearTimeout(saveTimer.current);
  }, [key, value]);

  return [value, setValue, state];
}

function persistBrowserBackup(key, value) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local persistence is best effort in restricted browsers.
  }
}
