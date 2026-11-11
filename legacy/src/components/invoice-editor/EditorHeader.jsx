import React from "react";
import { ChevronLeft } from "lucide-react";

export default function EditorHeader({ title, onBack, rightElement, children }) {
  return (
    <div className="bg-white sticky top-0 z-20 border-b border-border/60" style={{ paddingTop: "max(12px, env(safe-area-inset-top))" }}>
      <div className="flex items-center px-4 h-14">
        <button onClick={onBack} className="text-foreground p-1 -ml-1 flex-shrink-0 hover:bg-muted rounded-lg transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="flex-1 flex items-center justify-center font-bold text-lg text-foreground pointer-events-none px-2 truncate">
          {title}
        </h1>
        <div className="flex-shrink-0 min-w-[32px] flex items-center justify-end gap-1">{rightElement}</div>
      </div>
      {children}
    </div>
  );
}