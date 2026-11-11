import React from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

/**
 * Pill-shaped search input for mobile/tablet (white bg, rounded-full, light border).
 * Desktop keeps the original flat style.
 */
export default function SearchInput({
  placeholder,
  value,
  onChange,
  inputRef,
  className = "",
  desktopClassName = "md:bg-gray-100 md:border-0 md:rounded-xl",
  iconClassName = "w-4 h-4",
  inputClassName = "",
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 ${iconClassName} pointer-events-none md:left-2.5 md:text-gray-400`} />
      <Input
        ref={inputRef}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        className={`pl-11 h-11 bg-white border border-[#E5E5E5] rounded-full placeholder:text-slate-400 placeholder:text-sm placeholder:font-medium md:pl-8 md:h-8 md:text-sm md:placeholder:text-muted-foreground md:placeholder:font-normal ${desktopClassName} ${inputClassName}`}
      />
    </div>
  );
}