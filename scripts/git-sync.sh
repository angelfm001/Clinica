#!/usr/bin/env bash
# Sincroniza los cambios locales de este proyecto con GitHub:
# https://github.com/angelfm001/Clinica.git
#
# Hace, en orden: fetch -> add -> commit (si hay cambios) -> pull --rebase -> push.
#
# Mensaje de commit:
#   - Si pasas un argumento, se usa ese texto tal cual.
#   - Si no, se lee de scripts/commit-message.txt (junto a este script).
#   - Si ese archivo no existe o está vacío, se usa una marca de tiempo por defecto.
#
# Ruta del repo:
#   "${BASH_SOURCE[0]}" es la ruta de ESTE archivo .sh (aunque lo invoques
#   desde otra carpeta). `dirname` de esa ruta da "<repo>/scripts", y subir
#   un nivel con "/.." da la raíz del repo. Así el script funciona igual sin
#   importar desde dónde lo corras.
#
# Uso:
#   ./scripts/git-sync.sh
#   ./scripts/git-sync.sh "Filtros de pacientes y notificaciones en tiempo real"
#   REMOTE=origin BRANCH=main ./scripts/git-sync.sh

set -euo pipefail

REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-main}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

MESSAGE="${1:-}"
if [ -z "$MESSAGE" ] && [ -f "$SCRIPT_DIR/commit-message.txt" ]; then
  MESSAGE="$(cat "$SCRIPT_DIR/commit-message.txt" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
fi
if [ -z "$MESSAGE" ]; then
  MESSAGE="Actualizacion $(date '+%Y-%m-%d %H:%M')"
fi

echo "Repositorio : $REPO_ROOT"
echo "Remoto      : $REMOTE"
echo "Rama        : $BRANCH"
echo "Mensaje     : $MESSAGE"
echo ""

echo "Sincronizando referencias remotas..."
git fetch "$REMOTE"

# Se excluye la config local de Claude Code.
git add -A -- ':!.claude'

if git diff --cached --quiet; then
  echo "No hay cambios locales para commitear. Nada que subir."
  exit 0
fi

echo "Archivos a commitear:"
git diff --cached --name-only | sed 's/^/  /'
echo ""

git commit -m "$MESSAGE"

# Traer y aplicar el histórico remoto por si alguien más subió cambios,
# antes de intentar el push (evita un push rechazado).
git pull --rebase "$REMOTE" "$BRANCH"

git push "$REMOTE" "$BRANCH"

echo ""
echo "Listo: cambios subidos a $REMOTE/$BRANCH."
