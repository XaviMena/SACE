#!/usr/bin/env python3
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path
from typing import Iterable


RAIZ_REPO = Path(__file__).resolve().parents[1]
MAX_COMPONENTES_MENSAJE = 3


def ejecutar(comando: list[str], *, capturar: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        comando,
        cwd=RAIZ_REPO,
        check=False,
        text=True,
        capture_output=capturar,
    )


def obtener_salida(comando: list[str]) -> str:
    resultado = ejecutar(comando, capturar=True)
    if resultado.returncode != 0:
        raise RuntimeError(resultado.stderr.strip() or "No se pudo ejecutar el comando.")
    return resultado.stdout.strip()


def pedir_mensaje() -> str:
    mensaje = input("Mensaje del commit: ").strip()
    if not mensaje:
        raise ValueError("El mensaje del commit no puede estar vacío.")
    return mensaje


def obtener_estado() -> list[tuple[str, str]]:
    salida = obtener_salida(["git", "status", "--short"])
    if not salida:
        return []

    cambios: list[tuple[str, str]] = []
    for linea in salida.splitlines():
        estado = linea[:2]
        ruta = linea[3:].strip()
        if " -> " in ruta:
            ruta = ruta.split(" -> ", maxsplit=1)[1].strip()
        cambios.append((estado, ruta))
    return cambios


def normalizar_nombre(ruta: str) -> str:
    ruta_path = Path(ruta)
    nombre_archivo = ruta_path.stem.lower()

    etiquetas = {
        "package": "configuracion del proyecto",
        "globals": "estilos globales",
        "layout": "layout principal",
        "page": ruta_path.parent.name.replace("-", " "),
        "formulario-acceso": "formulario de acceso",
        "panel-aplicacion": "panel de aplicacion",
        "boton": "boton base",
    }

    if nombre_archivo in etiquetas:
        return etiquetas[nombre_archivo]

    if ruta_path.parent.name and ruta_path.parent.name not in {"app", "src", "components"}:
        return ruta_path.parent.name.replace("-", " ").replace("_", " ")

    return nombre_archivo.replace("-", " ").replace("_", " ")


def resumir_componentes(rutas: Iterable[str]) -> str:
    nombres: list[str] = []
    vistos: set[str] = set()

    for ruta in rutas:
        nombre = normalizar_nombre(ruta)
        if nombre in vistos:
            continue
        vistos.add(nombre)
        nombres.append(nombre)

    if not nombres:
        return "cambios del proyecto"

    if len(nombres) == 1:
        return nombres[0]

    if len(nombres) == 2:
        return f"{nombres[0]} y {nombres[1]}"

    visibles = nombres[:MAX_COMPONENTES_MENSAJE]
    resto = len(nombres) - len(visibles)
    if resto <= 0:
        return ", ".join(visibles[:-1]) + f" y {visibles[-1]}"
    return ", ".join(visibles) + f" y {resto} archivo(s) mas"


def elegir_accion(cambios: list[tuple[str, str]]) -> str:
    estados = "".join(estado for estado, _ in cambios)
    tiene_nuevos = "??" in estados or "A" in estados
    tiene_eliminados = "D" in estados
    tiene_modificados = "M" in estados or "R" in estados

    if tiene_nuevos and not tiene_modificados and not tiene_eliminados:
        return "agrega"
    if tiene_eliminados and not tiene_nuevos and not tiene_modificados:
        return "elimina"
    if tiene_modificados and not tiene_nuevos and not tiene_eliminados:
        return "actualiza"
    return "ajusta"


def generar_mensaje(cambios: list[tuple[str, str]]) -> str:
    accion = elegir_accion(cambios)
    componentes = resumir_componentes(ruta for _, ruta in cambios)
    return f"{accion} {componentes}"


def tiene_upstream() -> bool:
    resultado = ejecutar(
        ["git", "rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
        capturar=True,
    )
    return resultado.returncode == 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Hace git add, genera el mensaje del commit y hace push en SACE.",
    )
    parser.add_argument(
        "mensaje",
        nargs="?",
        help="Mensaje del commit. Si no se envía, se genera automaticamente.",
    )
    parser.add_argument(
        "--push",
        action="store_true",
        help="Mantiene compatibilidad con la version anterior. El push ya es el comportamiento por defecto.",
    )
    parser.add_argument(
        "--no-push",
        action="store_true",
        help="Crea el commit pero no hace push.",
    )
    parser.add_argument(
        "--pedir-mensaje",
        action="store_true",
        help="Pide el mensaje manualmente en vez de generarlo automaticamente.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Muestra el mensaje y los comandos que ejecutaria, sin crear commit ni hacer push.",
    )
    args = parser.parse_args()

    try:
        rama_actual = obtener_salida(["git", "branch", "--show-current"])
        cambios = obtener_estado()
    except RuntimeError as error:
        print(f"Error: {error}")
        return 1

    if not cambios:
        print("No hay cambios para commitear.")
        return 0

    mensaje = args.mensaje.strip() if args.mensaje else ""

    if not mensaje and args.pedir_mensaje:
        try:
            mensaje = pedir_mensaje()
        except ValueError as error:
            print(f"Error: {error}")
            return 1

    if not mensaje:
        mensaje = generar_mensaje(cambios)

    hacer_push = not args.no_push

    print(f"Rama actual: {rama_actual}")
    print("Cambios detectados:")
    print("\n".join(f"{estado} {ruta}" for estado, ruta in cambios))
    print(f"\nMensaje del commit: {mensaje}")

    if args.dry_run:
        print("\nDry run activado. No se realizaron cambios.")
        print("Comandos previstos:")
        print("git add -A")
        print(f'git commit -m "{mensaje}"')
        if hacer_push:
            if tiene_upstream():
                print("git push")
            else:
                print(f"git push --set-upstream origin {rama_actual}")
        return 0

    print("\nEjecutando git add -A ...")
    if ejecutar(["git", "add", "-A"]).returncode != 0:
        print("Error: no se pudo preparar el commit.")
        return 1

    print(f'Ejecutando git commit -m "{mensaje}" ...')
    if ejecutar(["git", "commit", "-m", mensaje]).returncode != 0:
        print("Error: no se pudo crear el commit.")
        return 1

    if not hacer_push:
        print("\nCommit creado correctamente.")
        return 0

    comando_push = ["git", "push"]
    if not tiene_upstream():
        comando_push = ["git", "push", "--set-upstream", "origin", rama_actual]

    print(f"\nEjecutando {' '.join(comando_push)} ...")
    if ejecutar(comando_push).returncode != 0:
        print("Error: el commit se creó, pero el push falló.")
        return 1

    print("Commit y push realizados correctamente.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
