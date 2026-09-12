#!/usr/bin/env bash
# Sincroniza los cambios locales de este proyecto con GitHub:
# https://github.com/angelfm001/Clinica.git
#
# Hace, en orden: fetch -> add -> commit (si hay cambios) -> pull --rebase -> push.
#
# Uso:
#   ./scripts/git-sync.sh
#   ./scripts/git-sync.sh "Filtros de pacientes y notificaciones en tiempo real"
#   REMOTE=origin BRANCH=main ./scripts/git-sync.sh "mensaje"

set -euo pipefail

MESSAGE="${1:-Actualizacion $(date '+%Y-%m-%d %H:%M')}"
REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-main}"

# Este script vive en <repo>/scripts, así que la raíz del repo es un nivel arriba.
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "Repositorio : $REPO_ROOT"
echo "Remoto      : $REMOTE"
echo "Rama        : $BRANCH"
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
