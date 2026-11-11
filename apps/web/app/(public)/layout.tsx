import { CadrePublic } from "@/components/cadre-public";

// La session vit dans le navigateur : ces pages s'affichent côté client, sans validation de navigation instantanée.
export const instant = false;

export default function LayoutPublic({ children }: LayoutProps<"/">) {
  return <CadrePublic>{children}</CadrePublic>;
}
