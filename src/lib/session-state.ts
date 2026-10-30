"use client";

import { useCallback, useState } from "react";
import type { SetStateAction } from "react";

/**
 * Estado que sobrevive à troca de páginas (navegação client-side), para o
 * usuário poder ir e voltar entre as ferramentas sem perder o que fez.
 * Fica só na memória da aba: recarregar a página começa do zero.
 */
const store = new Map<string, unknown>();

export function useSessionState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => (store.has(key) ? (store.get(key) as T) : initial));
  const update = useCallback(
    (next: SetStateAction<T>) => {
      setValue((previous) => {
        const resolved = typeof next === "function" ? (next as (prev: T) => T)(previous) : next;
        store.set(key, resolved);
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
}
