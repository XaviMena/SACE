import type { ReactNode } from "react";
import { PanelAplicacion } from "@/components/layout/panel-aplicacion";

export default function LayoutPanel({ children }: { children: ReactNode }) {
  return <PanelAplicacion>{children}</PanelAplicacion>;
}
