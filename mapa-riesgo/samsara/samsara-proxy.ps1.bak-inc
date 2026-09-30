param(
  [string]$ConfigPath = (Join-Path $PSScriptRoot 'samsara-config.json'),
  [int]$Port = 8787
)

# Samsara proxy local -- mantiene los API tokens fuera del navegador.
# Uso:  powershell -ExecutionPolicy Bypass -File .\samsara-proxy.ps1
# El mapa llama a:
#   http://localhost:8787/locations                      (unidades Samsara)
#   http://localhost:8787/traffic?bbox=W,S,E,N           (incidentes HERE, requiere hereKey)

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $ConfigPath)) {
  Write-Host "Falta la configuracion: $ConfigPath" -ForegroundColor Red
  Write-Host 'Crea samsara-config.json con: { "token": "TU_TOKEN_AQUI" }'
  exit 1
}
$config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
$token  = $config.token
if (-not $token -or $token -match '^\s*$' -or $token -eq 'TU_TOKEN_AQUI') {
  Write-Host 'Pon tu API token de Samsara en samsara-config.json' -ForegroundColor Red
  Write-Host '(Dashboard -> Settings -> API Tokens -> Add an API Token, scope: Read Vehicle Statistics)'
  exit 1
}
$baseUrl = if ($config.baseUrl) { $config.baseUrl } else { 'https://api.samsara.com' }
$ttl = 10   # segundos de cache

# HERE Traffic API v7 (incidentes y cierres). La key vive solo aqui.
$hereKey = $config.hereKey
$ttlTraffic = 90   # segundos de cache para incidentes

# Si aun no hay hereKey, se relee samsara-config.json en cada consulta para
# no tener que reiniciar el proxy despues de agregarla.
function Get-HereKey {
  if ($hereKey -and $hereKey -notmatch '^\s*$') { return $hereKey }
  try {
    $c = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
    if ($c.hereKey -and $c.hereKey -notmatch '^\s*$') {
      $script:hereKey = $c.hereKey
      Write-Host 'hereKey detectada en samsara-config.json (recarga en caliente).' -ForegroundColor Green
      return $script:hereKey
    }
  } catch { }
  return ''
}

$cache = @{ items = $null; stamp = [datetime]::MinValue }
$cacheTraffic = @{ key = ''; items = $null; stamp = [datetime]::MinValue }

function Get-SamsaraLocations {
  $headers = @{ Authorization = "Bearer $token" }
  $all = @()
  $after = ''
  do {
    $q = 'limit=512'
    if ($after) { $q += "&after=" + [uri]::EscapeDataString($after) }
    $r = Invoke-RestMethod -Uri "$baseUrl/v1/fleet/locations?$q" -Headers $headers -TimeoutSec 30 -UseBasicParsing
    if ($r.pagination -and $r.vehicles) {
      $all += $r.vehicles
      $after = $r.pagination.endCursor
      if (-not $r.pagination.hasNextPage) { $after = '' }
    } else { break }
  } while ($after)
  return $all
}

function Get-HereIncidents($bbox, $types, $crit) {
  $q = 'in=bbox:' + $bbox + '&locationReferencing=shape&lang=es-MX&units=metric&apiKey=' + [uri]::EscapeDataString($hereKey)
  if ($types) { $q += '&type=' + [uri]::EscapeDataString($types) }
  if ($crit)  { $q += '&criticality=' + [uri]::EscapeDataString($crit) }
  $r = Invoke-RestMethod -Uri "https://data.traffic.hereapi.com/v7/incidents?$q" -TimeoutSec 30 -UseBasicParsing
  $items = @()
  foreach ($res in @($r.results)) {
    $d = $res.incidentDetails
    $loc = $res.location
    $pts = @()
    if ($loc.shape -and $loc.shape.links) {
      foreach ($lk in @($loc.shape.links)) {
        foreach ($p in @($lk.points)) { $pts += , @([double]$p.lat, [double]$p.lng) }
      }
    }
    $items += [pscustomobject]@{
      id          = [string]$d.id
      type        = [string]$d.type
      criticality = [string]$d.criticality
      roadClosed  = [bool]$d.roadClosed
      summary     = [string]$d.summary.value
      description = [string]$d.description.value
      road        = [string]$loc.description
      startTime   = [string]$d.startTime
      endTime     = [string]$d.endTime
      length      = [double]$loc.length
      pts         = $pts
    }
  }
  return @{ sourceUpdated = [string]$r.sourceUpdated; items = $items }
}

function Send-Json($ctx, $obj, $status) {
  $body = $obj | ConvertTo-Json -Depth 8 -Compress
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($body)
  $resp = $ctx.Response
  $resp.StatusCode = $status
  $resp.ContentType = 'application/json; charset=utf-8'
  $resp.Headers.Add('Access-Control-Allow-Origin', '*')
  $resp.Headers.Add('Access-Control-Allow-Methods', 'GET, OPTIONS')
  $resp.Headers.Add('Access-Control-Allow-Headers', 'Content-Type')
  $resp.ContentLength64 = $bytes.Length
  $resp.OutputStream.Write($bytes, 0, $bytes.Length)
  $resp.Close()
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$Port/")
try { $listener.Start() }
catch {
  Write-Host "No pude iniciar el listener en localhost:$Port. Intenta:" -ForegroundColor Red
  Write-Host '  netsh http add urlacl url=http://localhost:8787 user=TODOS' -ForegroundColor Yellow
  Write-Host '  (o usa un puerto distinto con:  powershell -File .\samsara-proxy.ps1 -Port 9000)'
  exit 1
}

Write-Host "Samsara proxy activo:  http://localhost:$Port/locations   (Ctrl+C para salir)" -ForegroundColor Green
Write-Host "Incidentes (HERE):     http://localhost:$Port/traffic?bbox=W,S,E,N"
Write-Host "Base API: $baseUrl   Cache: ${ttl}s   HERE key: $(if ($hereKey) { 'configurada' } else { 'FALTA (agrega hereKey)' })"

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    try {
      $path = $ctx.Request.Url.AbsolutePath
      if ($ctx.Request.HttpMethod -eq 'OPTIONS') {
        $resp = $ctx.Response
        $resp.StatusCode = 204
        $resp.Headers.Add('Access-Control-Allow-Origin', '*')
        $resp.Headers.Add('Access-Control-Allow-Methods', 'GET, OPTIONS')
        $resp.Headers.Add('Access-Control-Allow-Headers', 'Content-Type')
        $resp.Close()
        continue
      }
      if ($path -eq '/health') {
        Send-Json $ctx (@{ ok = $true; time = (Get-Date).ToUniversalTime().ToString('o') }) 200
      }
      elseif ($path -eq '/locations') {
        if (($cache.items -ne $null) -and (((Get-Date) - $cache.stamp).TotalSeconds -lt $ttl)) {
          Send-Json $ctx $cache.items 200
        }
        else {
          $units = Get-SamsaraLocations
          $simpl = @($units | ForEach-Object {
            [pscustomobject]@{
              id    = [string]$_.id
              name  = $_.name
              lat   = $_.latitude
              lng   = $_.longitude
              heading = $_.heading
              speed = $_.speed
              onTrip = [bool]$_.onTrip
              time  = $_.time
              vin   = $_.vin
            }
          })
          $payload = @{ ok = $true; time = (Get-Date).ToUniversalTime().ToString('o'); count = $simpl.Count; units = $simpl }
          $cache.items = $payload
          $cache.stamp = Get-Date
          Send-Json $ctx $payload 200
        }
      }
      elseif ($path -eq '/traffic') {
        $hereKey = Get-HereKey
        if (-not $hereKey) {
          Send-Json $ctx (@{ ok = $false; needKey = $true; error = 'Falta hereKey en samsara-config.json' }) 200
        }
        else {
          $bbox = $ctx.Request.QueryString['bbox']
          if (-not $bbox) {
            Send-Json $ctx (@{ ok = $false; error = 'Falta el parametro bbox=W,S,E,N' }) 400
          }
          else {
            $types = $ctx.Request.QueryString['types']
            $crit  = $ctx.Request.QueryString['crit']
            $ckey  = "$bbox|$types|$crit"
            if (($cacheTraffic.items -ne $null) -and ($cacheTraffic.key -eq $ckey) -and (((Get-Date) - $cacheTraffic.stamp).TotalSeconds -lt $ttlTraffic)) {
              Send-Json $ctx $cacheTraffic.items 200
            }
            else {
              try {
                $res = Get-HereIncidents $bbox $types $crit
                $payload = @{ ok = $true; time = (Get-Date).ToUniversalTime().ToString('o'); sourceUpdated = $res.sourceUpdated; count = @($res.items).Count; items = @($res.items) }
                $cacheTraffic.items = $payload
                $cacheTraffic.key = $ckey
                $cacheTraffic.stamp = Get-Date
                Send-Json $ctx $payload 200
              }
              catch {
                $bad = $false
                $rsp = $_.Exception.Response
                if ($rsp -and (([int]$rsp.StatusCode -eq 401) -or ([int]$rsp.StatusCode -eq 403))) { $bad = $true }
                Send-Json $ctx (@{ ok = $false; badKey = $bad; error = $_.Exception.Message }) 200
              }
            }
          }
        }
      }
      else {
        Send-Json $ctx (@{ ok = $false; error = "Ruta desconocida: $path" }) 404
      }
    }
    catch {
      Send-Json $ctx (@{ ok = $false; error = $_.Exception.Message }) 500
    }
  }
}
finally {
  if ($listener) { $listener.Stop() }
  if ($listener) { $listener.Close() }
}