import type { ReactNode } from "react";
import { GuardiaAdmin } from "@/components/administracion/guardia-admin";

export default function LayoutAdministracion({ children }: { children: ReactNode }) {
  return <GuardiaAdmin>{children}</GuardiaAdmin>;
}
