export async function listar_asignaciones_docentes(periodo_id: string) {
  return Promise.resolve([
    {
      asignacion_id: "ad-001",
      periodo_id,
      docente_id: "0201305406",
      asignatura: "Lengua y Literatura",
      paralelo: "3 BGU A",
    },
    {
      asignacion_id: "ad-002",
      periodo_id,
      docente_id: "0201114246",
      asignatura: "Matemática",
      paralelo: "10 EGB B",
    },
  ]);
}
