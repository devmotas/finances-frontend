# Minhas Finanças (frontend)

Aplicação Angular para controle financeiro pessoal: visão geral por mês, entradas, saídas (essenciais e não essenciais), investimentos (aportes e resgates), reserva de emergência e configurações da conta. Cada usuário tem login próprio e os dados ficam no backend.

## Backend

Os dados são lidos e gravados pela API Node.js do repositório `finances-backend-js`, publicada na Vercel com banco Postgres (Neon). O frontend fala com ela por HTTP e autentica com token JWT (enviado no header `Authorization` pelo `auth.interceptor`).

A primeira chamada depois de um período parado pode levar alguns segundos (cold start da Vercel/Neon). Durante qualquer requisição o app mostra uma barra de progresso no topo e os botões de ação ficam desabilitados com o texto do que está acontecendo ("Salvando…", "Excluindo…").

## Como executar

```bash
npm install
npm start
```

Abra `http://localhost:4200/`. Sem sessão ativa o app abre a tela de **login**; use **Criar cadastro** para criar uma conta.

Para desenvolvimento local o backend precisa estar rodando em `http://localhost:3000` (veja o README do `finances-backend-js`).

## Ambientes

A URL da API vem de `apiBaseUrl`:

- `src/environments/environment.ts` (desenvolvimento): `http://localhost:3000`
- `src/environments/environment.prod.ts` (produção): `https://finances-backend-js.vercel.app`

Troca automática:

- `npm start` usa `environment.ts`
- `npm run build` usa `environment.prod.ts` (via `fileReplacements` do Angular)

O `api-base-url.interceptor` prefixa essa URL em toda requisição relativa (ex.: `/transactions`).

## Build de produção

```bash
npm run build
```

Artefatos em `dist/finances-frontend/`, prontos para qualquer hospedagem estática.

## Testes

```bash
npm test
```

Para rodar uma vez, sem abrir o navegador:

```bash
npx ng test --watch=false --browsers=ChromeHeadless
```

Os testes (Karma + Jasmine) cobrem os cálculos financeiros, o estado de carga do mês no `FinancesFacadeService`, o contador de requisições em andamento, o botão com estado de carregamento e o fluxo de exclusão de lançamentos de séries.

## Uso

Na primeira visita não há categorias: use **Categoria** em cada tela para criar as suas. O filtro **Todos** / **Todas** nos chips é só visualização (mostra tudo do mês) e não é uma categoria gravada. Para lançar valores é obrigatório existir ao menos uma categoria do fluxo.

Lançamentos **fixos** criam uma série mensal; ao editar ou excluir um item da série é possível aplicar só ao mês atual ou também aos meses seguintes.

## Stack

- Angular 19 (standalone, signals)
- SCSS, `pt-BR` e moeda BRL
- Gráficos com Chart.js via `ng2-charts`
- Ícones: [Lucide](https://lucide.dev/) via `lucide-angular` (registro em [`src/app/core/icons/app-lucide-icons.ts`](src/app/core/icons/app-lucide-icons.ts) + `LucideAngularModule.pick` no `app.config`)
