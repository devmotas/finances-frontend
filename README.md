# Minhas Finanças (frontend)

Aplicação Angular para controle financeiro pessoal: visão geral por mês, entradas, saídas (essenciais e não essenciais), categorias e lançamentos com tipo fixa ou apenas do mês.

## Como executar

```bash
npm install
npm start
```

Abra `http://localhost:4200/`. A rota inicial redireciona para **Visão Geral**.

## Build de produção

```bash
npm run build
```

Artefatos em `dist/finances-frontend/`. Pode ser publicado em qualquer hospedagem estática (Netlify, Vercel, S3, etc.).

## Dados e persistência

Os dados ficam no **localStorage** do navegador, chave `finances-app-v1` (JSON com categorias e transações). Não há sincronização entre dispositivos nem backup automático; limpar os dados do site remove o histórico.

Na primeira visita, categorias padrão (entradas e saídas do seu modelo) são criadas automaticamente.

## Testes

```bash
npm test
```

Inclui testes unitários dos cálculos financeiros em `src/app/core/utils/finance-calculations.spec.ts`.

## Stack

- Angular 19 (standalone, signals)
- SCSS, `pt-BR` e moeda BRL
- Sem backend neste repositório
