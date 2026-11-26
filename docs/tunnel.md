# Túnel fixo (Cloudflare)

Usa Cloudflare Tunnel nomeado para URL estável. Requer domínio na Cloudflare.

## 1. Instalar

```powershell
winget install --id Cloudflare.cloudflared
```

## 2. Login e criar túnel

```powershell
cloudflared tunnel login
cloudflared tunnel create dita
cloudflared tunnel route dns dita dita.seudominio.com
```

## 3. Config

Crie `%USERPROFILE%\.cloudflared\config.yml`:

```yaml
tunnel: <TUNNEL-ID>
credentials-file: C:\Users\<voce>\.cloudflared\<TUNNEL-ID>.json

ingress:
  - hostname: dita.seudominio.com
    service: http://127.0.0.1:8787
  - service: http_status:404
```

Pegue o `<TUNNEL-ID>` em `cloudflared tunnel list`.

## 4. Rodar

```powershell
cloudflared tunnel run dita
```

## 5. Serviço Windows (sobe com o PC)

Abra PowerShell como Administrador:

```powershell
cloudflared service install
```

O serviço lê `%USERPROFILE%\.cloudflared\config.yml`. Garanta que a Ponte também sobe no boot (Agendador de Tarefas ou NSSM) antes de confiar 100% no acesso remoto.

## Segurança

- URL pública = acesso ao seu PC. Use senha forte em `DITA_PASSWORD`.
- HTTPS vem do Cloudflare.
- Prefira Tailscale se quiser acesso privado sem expor URL pública.