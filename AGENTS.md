# AGENTS.md

Regras para agentes que trabalham neste repositório.

## Testes

- Todo bug corrigido entra com um teste de regressão que falha antes da correção e passa depois.
- Toda mudança de comportamento entra com teste. Refatoração sem mudança de comportamento pode não ter teste novo, mas a suíte precisa continuar verde.
- Nome do teste descreve o comportamento observável, não a implementação.
- Rode `npm test` antes de cada commit. Suíte vermelha, commit não.
- Rode `npm run build` antes de cada commit que mexa em `app/` ou `server/`.

## Onde os testes vivem

- `server/test/` — vitest, ambiente Node. Unitários de normalização, auth, projetos e rotas.
- `app/src/**/*.test.tsx` — vitest com jsdom e Testing Library. Componentes e comportamento de tela.
- Testes de regressão devem citar o sintoma no `describe` ou no `it` quando não for óbvio.

## Commits

- Conventional Commits em português: `feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`.
- Ao fechar uma fase, commite a fase inteira. Correções isoladas podem ser commit próprio.

## Estilo

- TypeScript estrito nos dois workspaces.
- Dinheiro, credenciais e modelos nunca são logados.
- Áudio, credenciais e conteúdo de conversa não saem do PC sem pedido explícito.
