@echo off
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -Command "& {
    $ErrorActionPreference = 'Stop'

    $root     = Split-Path -Parent $MyInvocation.MyCommand.Path
    $htmlPath = Join-Path $root 'index.html'
    $cssPath  = Join-Path $root 'src\style.css'
    $jsPath   = Join-Path $root 'src\app.js'
    $distPath = Join-Path $root 'dist\score.html'
    $docsPath = Join-Path $root 'docs\index.html'

    $html   = [System.IO.File]::ReadAllText($htmlPath,  [System.Text.Encoding]::UTF8)
    $css    = [System.IO.File]::ReadAllText($cssPath,   [System.Text.Encoding]::UTF8)
    $jsRaw  = [System.IO.File]::ReadAllText($jsPath,    [System.Text.Encoding]::UTF8)

    # Remove the Node.js / Jest export block from the end of app.js
    $marker = '/* Allow Jest to import pure functions without a DOM */'
    $idx    = $jsRaw.IndexOf($marker)
    if ($idx -ge 0) {
        $js = $jsRaw.Substring(0, $idx).TrimEnd()
    } else {
        $js = $jsRaw.TrimEnd()
    }

    # Replace CSS link tag with inline <style>
    $cssTag    = '<link rel=""stylesheet"" href=""src/style.css"" />'
    $cssInline = ""<style>`n$css`n</style>""
    $html      = $html.Replace($cssTag, $cssInline)

    # Replace JS script tag with inline <script>
    $jsTag    = '<script src=""src/app.js""></script>'
    $jsInline = ""<script>`n$js`n</script>""
    $html     = $html.Replace($jsTag, $jsInline)

    $null = New-Item -ItemType Directory -Force -Path (Split-Path $distPath)
    $null = New-Item -ItemType Directory -Force -Path (Split-Path $docsPath)

    [System.IO.File]::WriteAllText($distPath, $html, [System.Text.Encoding]::UTF8)
    [System.IO.File]::WriteAllText($docsPath, $html, [System.Text.Encoding]::UTF8)

    Write-Host 'Build concluido com sucesso!'
    Write-Host \"  -> $distPath\"
    Write-Host \"  -> $docsPath\"
}"

if %ERRORLEVEL% neq 0 (
    echo Erro no build. Verifique a saida do PowerShell acima.
    exit /b %ERRORLEVEL%
)
