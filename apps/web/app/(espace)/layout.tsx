import { CadreEspace } from "@/components/cadre-espace";

// La session vit dans le navigateur : l'espace s'affiche côté client, sans validation de navigation instantanée.
export const instant = false;

export default function LayoutEspace({ children }: LayoutProps<"/">) {
  return <CadreEspace>{children}</CadreEspace>;
}
