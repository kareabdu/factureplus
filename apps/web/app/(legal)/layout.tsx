"use client";

import Link from "next/link";

import { Logo } from "@/components/ui";

// Pages publiques statiques (politique de confidentialité, assistance) : lisibles sans connexion,
// y compris par un utilisateur connecté (pas de redirection, contrairement au groupe (public)).
export default function LayoutLegal({ children }: LayoutProps<"/">) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-8 sm:py-12">
      <Link href="/" className="mb-8 self-start"><Logo /></Link>
      <article className="flex flex-col gap-6 text-[15px] leading-relaxed text-foreground [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
        {children}
      </article>
    </div>
  );
}
