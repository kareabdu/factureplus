import React, { useState, useEffect, useRef } from "react";

const LOGO_URL = "https://media.base44.com/images/public/6a3b047b6054a9a30af8781d/494a02179_logo-vert-512.png";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  const [scrollY, setScrollY] = useState(0);
  const scrollRef = useRef(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollY(el.scrollTop);
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  // Compact header: hidden at top, appears after 50px, fully visible at 130px
  const compactProgress = Math.min(1, Math.max(0, (scrollY - 50) / 80));

  return (
    <div className="h-dvh flex flex-col overflow-hidden relative bg-emerald-600">
      {/* Scrollable container */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
        {/* Large emerald header */}
        <div
          className="px-6 flex flex-col items-center text-center"
          style={{ paddingTop: 'max(28px, env(safe-area-inset-top))', paddingBottom: '64px' }}>
          
          

          
          <h1 className="font-heading text-2xl font-bold text-white tracking-tight">StockTracker</h1>
          <p className="text-sm text-emerald-50/90 mt-1 max-w-xs">
            Gérez votre stock et vos ventes en toute simplicité.
          </p>
        </div>

        {/* White overlapping card */}
        <div
          className="bg-background rounded-t-[40px] -mt-10 px-5 pt-7 shadow-2xl"
          style={{ paddingBottom: 'max(32px, env(safe-area-inset-bottom))' }}>
          
          <div className="w-full max-w-md mx-auto">
            <div className="text-center mb-6">
              {Icon &&
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl shadow-sm mb-4 bg-emerald-600">
                  <Icon className="w-6 h-6 text-white" aria-hidden="true" />
                </div>
              }
              {title && <h2 className="font-heading text-xl font-semibold text-foreground tracking-tight">{title}</h2>}
              {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}
            </div>
            <div className="bg-card rounded-2xl shadow-sm border border-border/60 p-6 sm:p-8">
              {children}
            </div>
            {footer &&
            <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
            }
          </div>
        </div>
      </div>

      {/* Compact sticky header — hidden at top, slides down & overlaps emerald header on scroll */}
      <div
        className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center pointer-events-none"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          height: 'calc(52px + env(safe-area-inset-top))',
          opacity: compactProgress,
          transform: `translateY(${(1 - compactProgress) * -24}px)`,
          backgroundColor: `rgba(7, 164, 63, ${compactProgress})` /* #07A43F */,
          boxShadow: compactProgress > 0.1 ? `0 1px 3px rgba(0,0,0,${compactProgress * 0.15})` : 'none'
        }}>
        
        <span className="font-heading font-semibold text-white text-lg tracking-tight">StockTracker</span>
      </div>
    </div>);

}