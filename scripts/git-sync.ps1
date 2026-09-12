<#
  Sincroniza los cambios locales de este proyecto con GitHub:
  https://github.com/angelfm001/Clinica.git

  Hace, en orden: fetch -> add -> commit (si hay cambios) -> push.

  Uso:
    .\scripts\git-sync.ps1
    .\scripts\git-sync.ps1 -Message "Filtros de pacientes y notificaciones en tiempo real"
    .\scripts\git-sync.ps1 -Branch main -Remote origin
#>
param(
    [string]$Message = "Actualizacion $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
    [string]$Remote = "origin",
    [string]$Branch = "main"
)

$ErrorActionPreference = "Stop"

# Este script vive en <repo>/scripts, así que la raíz del repo es un nivel arriba.
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host "Repositorio : $repoRoot"
Write-Host "Remoto      : $Remote"
Write-Host "Rama        : $Branch"
Write-Host ""

# 1) Traer el estado remoto antes de tocar nada.
Write-Host "Sincronizando referencias remotas..."
git fetch $Remote

# 2) Preparar los cambios locales (se excluye la config local de Claude Code).
git add -A -- ':!.claude'

$staged = git diff --cached --name-only
if (-not $staged) {
    Write-Host "No hay cambios locales para commitear. Nada que subir."
    exit 0
}

Write-Host "Archivos a commitear:"
$staged | ForEach-Object { Write-Host "  $_" }
Write-Host ""

# 3) Commit.
git commit -m $Message

# 4) Traer y aplicar el histórico remoto por si alguien más subió cambios,
#    antes de intentar el push (evita un push rechazado).
git pull --rebase $Remote $Branch

# 5) Subir.
git push $Remote $Branch

Write-Host ""
Write-Host "Listo: cambios subidos a $Remote/$Branch."
