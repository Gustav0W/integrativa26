"use client";

import { useCallback, useEffect, useState } from "react";
import type { SetStateAction } from "react";

/**
 * Estado que sobrevive à troca de páginas (navegação client-side), para o
 * usuário poder ir e voltar entre as ferramentas sem perder o que fez.
 * Também é salvo no `localStorage`, então sobrevive a recarregar a página.
 * O valor salvo só é lido depois da montagem, para não quebrar a hidratação.
 */
const store = new Map<string, unknown>();
const STORAGE_PREFIX = "smartbuild:";

function readStored<T>(key: string): { value: T } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + key);
    return raw === null ? null : { value: JSON.parse(raw) as T };
  } catch {
    return null;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch {
    // Armazenamento cheio ou bloqueado (aba anônima): segue só em memória.
  }
}

export function useSessionState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => (store.has(key) ? (store.get(key) as T) : initial));

  useEffect(() => {
    if (store.has(key)) return;
    const stored = readStored<T>(key);
    if (stored) {
      store.set(key, stored.value);
      // Hidratação a partir do localStorage: só dá para ler depois da montagem.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(stored.value);
    }
  }, [key]);

  const update = useCallback(
    (next: SetStateAction<T>) => {
      setValue((previous) => {
        const resolved = typeof next === "function" ? (next as (prev: T) => T)(previous) : next;
        store.set(key, resolved);
        writeStored(key, resolved);
        return resolved;
      });
    },
    [key],
  );
  return [value, update] as const;
}

/** Pré-carrega o estado de outra página antes de navegar até ela. */
export function writeSessionState<T>(key: string, value: T) {
  store.set(key, value);
  writeStored(key, value);
}
