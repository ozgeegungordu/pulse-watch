import { reactive } from 'vue';

type ToastKind = 'success' | 'error' | 'info';
export type ToastItem = { id: number; message: string; kind: ToastKind };

const state = reactive<{ items: ToastItem[] }>({ items: [] });
let nextId = 1;

function show(message: string, kind: ToastKind = 'info') {
  const id = nextId++;
  state.items.push({ id, message, kind });
  window.setTimeout(() => dismiss(id), 3600);
}

function dismiss(id: number) {
  const index = state.items.findIndex((item) => item.id === id);
  if (index >= 0) state.items.splice(index, 1);
}

export function useToast() {
  return {
    items: state.items,
    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error'),
    info: (message: string) => show(message, 'info'),
    dismiss,
  };
}
