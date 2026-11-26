# dita

Dite do celular, desenvolva no PC. O **dita** é um PWA instalável que manda seus ditados para uma **Sessão** do [OpenCode](https://opencode.ai) rodando na sua máquina, e mostra as respostas em tempo real.

## Como funciona

- **Ponte** (`server/`): servidor Node no PC. Guarda a senha do OpenCode, sobe o `opencode serve` quando necessário, cria a Sessão, envia os ditados e serve o PWA.
- **App** (`app/`): React + Vite + PWA. Login por senha, seletor de projetos, conversa em tempo real via SSE.
- Uma **Sessão raiz** vive em `Documents\Projetos`. O seletor muda o **Foco**, não a Sessão.

```
celular ──HTTPS──> túnel ──> Ponte :8787 ──Basic auth──> opencode serve :4096
                                  │
                                  └─ serve o PWA (app/dist)
```

## Requisitos

- Node.js 22+
- OpenCode CLI instalado (`opencode --version`)
- Git (para `git init` nos projetos novos)

## Rodar

```powershell
npm install
npm run dev     # Ponte em :8787 e Vite em :5173
```

Produção:

```powershell
npm run build
npm start       # Ponte serve o PWA em http://127.0.0.1:8787
```

No primeiro boot, a Ponte gera a senha e grava em `~/.dita/credentials.json`. Para definir a sua, use `DITA_PASSWORD` (veja `.env.example`).

### Variáveis principais

| Variável | Padrão | Uso |
| --- | --- | --- |
| `DITA_PASSWORD` | gerada | senha do app |
| `DITA_PORT` | `8787` | porta da Ponte |
| `DITA_ROOT` | `~/Documents/Projetos` | raiz navegada pelo seletor |
| `DITA_MANAGE_OPENCODE` | `true` | `false` usa um OpenCode já rodando |
| `OPENCODE_URL` | `http://127.0.0.1:4096` | servidor OpenCode |
| `OPENCODE_PASSWORD` | gerada | senha Basic do OpenCode |

## Expor na internet

O túnel é o que deixa o app acessível de qualquer lugar. Cloudflare Tunnel, grátis:

```powershell
winget install --id Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:8787
```

O comando imprime uma URL `https://….trycloudflare.com`. Ela muda a cada execução; para um endereço fixo, crie um named tunnel no painel da Cloudflare.

Depois, no Android: abra a URL no Chrome, menu **⋮ → Instalar app**. O PWA ganha ícone próprio e abre em tela cheia.

> Segurança: quem tiver a URL e a senha tem o mesmo poder que você no PC — editar arquivos e rodar comandos. Use HTTPS (o túnel já dá), senha forte e não compartilhe o endereço. Neste projeto a senha é a única barreira.

## Usar

1. Entre com a senha.
2. Escolha o **Foco** (projeto) ou fique na raiz.
3. Toque no microfone do teclado do Android e dite.
4. Envie. A resposta aparece na conversa em tempo real.
5. **+** cria projeto (pasta + `git init` + README + `.gitignore`).
6. A lixeira move o projeto para `_lixeira/<nome>-<data>`; nada é apagado de imediato.

## Estrutura

```
dita/
├── app/              PWA (React, Vite, Tailwind, vite-plugin-pwa)
├── server/           Ponte (Fastify, TypeScript)
├── docs/adr/         decisões arquiteturais
├── GLOSSARY.md       vocabulário do domínio
└── .env.example
```

## Fases

- [x] **Fase 1** — Ponte, login, projetos, Sessão raiz, Foco, enviar texto, conversa em tempo real.
- [ ] **Fase 2** — ditado dentro do app (Web Speech API) com fallback.
- [ ] **Fase 3** — transcrição no PC com `whisper.cpp`.
- [ ] **Fase 4** — Web Push e tela de Aprovação para Ações de risco.

## Testes

```powershell
npm test
```

## Limitações conhecidas

- Conversa em tempo real por polling de 900 ms, não streaming token a token.
- Sem PWA offline: o app depende da Ponte para tudo.
- Um único usuário.
- O `opencode serve` sobe com as permissões padrão do OpenCode; as regras de Ação de risco entram na Fase 4.
