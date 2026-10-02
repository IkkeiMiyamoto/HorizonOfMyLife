import { X } from "lucide-react";
import type { ReactNode } from "react";

export default function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow?: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm fade-in" onMouseDown={onClose}>
      <div className="glass-strong max-h-[calc(100vh-2rem)] w-full max-w-lg overflow-y-auto rounded-2xl p-6 shadow-2xl shadow-black/60" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            <h2 className="mt-1 font-display text-xl font-bold text-white">{title}</h2>
          </div>
          <button className="btn-ghost !px-2" onClick={onClose} aria-label="閉じる">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
