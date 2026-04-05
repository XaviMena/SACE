const ORDEN_JORNADA = ["MATUTINA", "VESPERTINA", "NOCTURNA"] as const;

function a_mayusculas_sin_acentos(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .trim();
}

export function obtener_clave_orden_jornada(jornada: string) {
  const valor = a_mayusculas_sin_acentos(jornada);
  const indice = ORDEN_JORNADA.findIndex((item) => valor.includes(item));
  return indice >= 0 ? indice : 9;
}

export function obtener_clave_orden_grado(gradoCompleto: string) {
  const original = a_mayusculas_sin_acentos(gradoCompleto).replace(/\s+/g, " ");

  let paralelo = "Z";
  const coincidenciaParalelo = original.match(/\s([A-Z])$/);

  let base = original;
  if (coincidenciaParalelo) {
    paralelo = coincidenciaParalelo[1];
    base = original.slice(0, -2).trim();
  }

  if (base.includes("GRUPO") || base.includes("INICIAL")) {
    const numero = Number(base.match(/\d+/)?.[0] ?? 0);
    return [0, numero, paralelo] as const;
  }

  if (base.includes("EGB") || base.includes("BASICA") || base.includes("GENERAL")) {
    const numero = Number(base.match(/\d+/)?.[0] ?? 0);
    return [1, numero, paralelo] as const;
  }

  if (base.includes("BGU") || base.includes("BACHILLERATO")) {
    const numero = Number(base.match(/\d+/)?.[0] ?? 0);
    return [2, numero, paralelo] as const;
  }

  return [3, 0, paralelo] as const;
}

export function obtener_clave_orden_completa(jornada: string, grado: string, paralelo?: string | null) {
  const jornadaClave = obtener_clave_orden_jornada(jornada);
  const gradoClave = paralelo
    ? obtener_clave_orden_grado(`${grado} ${paralelo}`)
    : obtener_clave_orden_grado(grado);

  return [jornadaClave, ...gradoClave] as const;
}

export function ordenar_por_criterio_institucional<T>(
  items: T[],
  lector: (item: T) => {
    jornada?: string | null;
    grado?: string | null;
    paralelo?: string | null;
  },
) {
  return [...items].sort((a, b) => {
    const valorA = lector(a);
    const valorB = lector(b);

    const claveA = obtener_clave_orden_completa(
      valorA.jornada ?? "",
      valorA.grado ?? "",
      valorA.paralelo ?? undefined,
    );
    const claveB = obtener_clave_orden_completa(
      valorB.jornada ?? "",
      valorB.grado ?? "",
      valorB.paralelo ?? undefined,
    );

    for (let indice = 0; indice < claveA.length; indice += 1) {
      if (claveA[indice] < claveB[indice]) {
        return -1;
      }

      if (claveA[indice] > claveB[indice]) {
        return 1;
      }
    }

    return 0;
  });
}
