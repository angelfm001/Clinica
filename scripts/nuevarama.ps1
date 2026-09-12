<#
  Crea (o reutiliza) una rama nueva y guarda ahí los cambios locales
  actuales, SIN tocar la rama en la que estabas ni subir nada a ella.

  Nombre de la rama:
    Se lee de scripts\branch-name.txt (junto a este script). Edita ese
    archivo con el nombre que quieras antes de correr el script.

  Mensaje de commit:
    - Si pasas -Message, se usa ese texto tal cual.
    - Si no, se lee de scripts\commit-message.txt (mismo archivo que usa
      git-sync.ps1).
    - Si tampoco existe, se usa una marca de tiempo por defecto.

  Ruta del repo:
    $PSScriptRoot es la carpeta de ESTE archivo .ps1 (siempre
    "<repo>\scripts"). Subir un nivel da la raíz del repo, así que el
    script funciona igual sin importar desde dónde lo invoques.

  Qué hace, en orden:
    1. Guarda el nombre de la rama actual.
    2. Crea la rama nueva desde el punto actual (o la reutiliza si ya existe).
    3. Commitea ahí los cambios pendientes.
    4. Sube esa rama nueva a GitHub (git push -u).
    5. Vuelve a la rama original, que queda intacta y sin subir cambios.

  Uso:
    .\scripts\git-new-branch.ps1
    .\scripts\git-new-branch.ps1 -Message "Prueba de nueva funcionalidad"
    .\scripts\git-new-branch.ps1 -Remote origin
#>
param(
    [string]$Message,
    [string]$Remote = "origin"
)

$ErrorActionPreference = "Stop"

# Este script vive en <repo>/scripts, así que la raíz del repo es un nivel arriba.
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

# 1) Nombre de la rama: obligatorio, viene de branch-name.txt.
$branchFile = Join-Path $PSScriptRoot "branch-name.txt"
if (-not (Test-Path $branchFile)) {
    throw "No se encontró $branchFile. Crea ese archivo con el nombre de la rama a usar."
}
$newBranch = (Get-Content -Path $branchFile -Raw).Trim()
if (-not $newBranch) {
    throw "$branchFile está vacío. Escribe ahí el nombre de la rama a crear."
}

# 2) Mensaje de commit: -Message, si no commit-message.txt, si no una marca de tiempo.
if (-not $Message) {
    $msgFile = Join-Path $PSScriptRoot "commit-message.txt"
    if (Test-Path $msgFile) {
        $Message = (Get-Content -Path $msgFile -Raw).Trim()
    }
}
if (-not $Message) {
    $Message = "Actualizacion $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
}

# 3) Verificar que hay cambios (staged, modificados o nuevos); si no hay nada, no tiene sentido crear la rama.

$pending = git status --porcelain
if (-not $pending) {
    Write-Host "No hay cambios locales para guardar. No se crea ninguna rama."
    exit 0
}

$originalBranch = git rev-parse --abbrev-ref HEAD

Write-Host "Repositorio      : $repoRoot"
Write-Host "Rama actual      : $originalBranch"
Write-Host "Rama nueva       : $newBranch"
Write-Host "Remoto           : $Remote"
Write-Host "Mensaje          : $Message"
Write-Host ""
Write-Host "Archivos a commitear:"
$pending | ForEach-Object { Write-Host "  $_" }
Write-Host ""

# 4) Crear la rama nueva (o cambiar a ella si ya existe) sin perder lo ya agregado al índice.
$branchExists = git branch --list $newBranch
if ($branchExists) {
    Write-Host "La rama '$newBranch' ya existe localmente; se usará esa."
    git checkout $newBranch
} else {
    git checkout -b $newBranch
}

# 5) Agregar todos los cambios pendientes y commitear en la rama nueva.
git add -A
git commit -m $Message

# 6) Subir la rama nueva a GitHub (no toca la rama original en el remoto).
git push -u $Remote $newBranch

# 7) Volver a la rama original, que queda como estaba (sin estos cambios).
git checkout $originalBranch

Write-Host ""
Write-Host "Listo: cambios guardados y subidos en '$newBranch'."
Write-Host "Estás de vuelta en '$originalBranch', sin cambios pendientes ahí."
