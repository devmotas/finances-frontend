# Minhas Finanças (frontend)

Aplicação Angular para controle financeiro pessoal: visão geral por mês, entradas, saídas (essenciais e não essenciais), categorias e lançamentos com tipo fixa ou apenas do mês.

## Como executar

```bash
npm install
npm start
```

Abra `http://localhost:4200/`. A rota inicial redireciona para **Visão Geral**.

## Ambientes

O frontend usa os arquivos:

- `src/environments/environment.ts` (local/dev)
- `src/environments/environment.prod.ts` (produção)

Troca automática:

- `npm start` usa `environment.ts`
- `npm run build` usa `environment.prod.ts` (via `fileReplacements` do Angular)

## Build de produção

```bash
npm run build
```

Artefatos em `dist/finances-frontend/`. Pode ser publicado em qualquer hospedagem estática (Netlify, Vercel, S3, etc.).

## Dados e persistência

Os dados ficam no **localStorage** do navegador, chave `finances-app-v1` (JSON com categorias e transações). Não há sincronização entre dispositivos nem backup automático; limpar os dados do site remove o histórico.

Na primeira visita não há categorias: use **Categoria** para criar as suas. O filtro **Todos** / **Todas** nos chips é só visualização (mostra tudo do mês) e não é uma categoria gravada. Para lançar receitas ou despesas é obrigatório existir ao menos uma categoria real.

## Testes

```bash
npm test
```

Inclui testes unitários dos cálculos financeiros em `src/app/core/utils/finance-calculations.spec.ts`.

## Stack

- Angular 19 (standalone, signals)
- SCSS, `pt-BR` e moeda BRL
- Ícones: [Lucide](https://lucide.dev/) via `lucide-angular` (registro em [`src/app/core/icons/app-lucide-icons.ts`](src/app/core/icons/app-lucide-icons.ts) + `LucideAngularModule.pick` no `app.config`)
- Sem backend neste repositório
