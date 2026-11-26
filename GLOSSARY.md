# dita

Contexto do dita: um app de celular para ditar comandos e desenvolver remotamente pelo OpenCode.

## Linguagem

**Ditado**:
Uma fala transcrita em texto e enviada à **Sessão**.
_Avoid_: comando de voz, áudio, mensagem

**Ponte**:
O servidor no PC que guarda as credenciais, fala com o OpenCode e serve o PWA.
_Avoid_: backend, API, servidor

**Sessão**:
A conversa contínua no OpenCode. Existe uma **Sessão** raiz em `Documents\Projetos`.
_Avoid_: chat, thread, conversa

**Foco**:
O projeto selecionado no app dentro da **Sessão** raiz. Muda o contexto do próximo **Ditado**, não a **Sessão**.
_Avoid_: projeto atual, diretório

**Projeto**:
Uma pasta de trabalho dentro da raiz de projetos, com `git init` próprio.
_Avoid_: repositório, repo

**Aprovação**:
Um pedido de permissão pendente que o agente precisa que o usuário aceite ou rejeite.
_Avoid_: confirmação, prompt

**Ação de risco**:
Comando destrutivo ou irreversível, como apagar em massa, `git push --force` ou deploy.
_Avoid_: operação perigosa

**Modo autônomo**:
Estado em que edições e comandos comuns são liberados sem **Aprovação**.
_Avoid_: auto-approve, permissão total

**Lixeira**:
Pasta `_lixeira` na raiz de projetos para onde **Projetos** removidos são movidos.
_Avoid_: trash, exclusão
