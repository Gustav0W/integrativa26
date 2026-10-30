# SmartBuild AI

Sistema web que ajuda pessoas leigas ou entusiastas a montar o computador ideal para o que fazem — sem incompatibilidade entre peças, sem gargalos e dentro do orçamento. Projeto da disciplina Integrativa (Uniplac).

## O que a plataforma faz

| Página | Para quem | O que faz |
| --- | --- | --- |
| **Assistente** (`/assistente`) | Quem não entende de peças | Orçamento + usos do PC → build completa com o motivo de cada peça |
| **Conversar** (`/conversar`) | Quem prefere escrever | Chat: pede uma build, ajustes nela ou tira dúvidas sobre peças e preços |
| **Montar** (`/montar`) | Quem já viu peças que gostou | Escolhe peça por peça; a IA avalia compatibilidade e uso em tempo real |
| **Analisar PDF** (`/analisar`) | Quem recebeu um orçamento | Lê o PDF (ou texto) de um orçamento/anúncio e diz se vale a pena |

## Como rodar no seu computador

Requisitos: Node.js 20+ e npm.

```bash
npm install
cp .env.example .env.local   # depois coloque a sua chave do Gemini dentro
npm run dev                  # abre em http://localhost:3000
```

A chave do Gemini é gratuita: crie em <https://aistudio.google.com/apikey>. **Nunca faça commit da chave** — o `.env.local` já está no `.gitignore`. Sem chave, o site funciona em **modo offline** (motor local + palavras-chave), só que sem a IA de linguagem.

Outros comandos: `npm run build` (build de produção) e `npm run lint`.

## Como a "IA" funciona

O sistema é **híbrido**, e cada parte faz o que sabe fazer melhor:

1. **Gemini (IA generativa)** — entende o que a pessoa escreveu, decide se é um pedido de build ou uma pergunta, lê PDFs e escreve as explicações. Arquivo: `src/lib/server/gemini.ts`.
2. **Motor de recomendação (algoritmo próprio)** — testa todas as combinações compatíveis do catálogo (~300 mil), pontua cada uma de acordo com os usos (jogos, arquitetura, programação, estudo), penaliza gargalos e escolhe a melhor dentro do orçamento. Garante que a IA nunca invente peças ou monte algo incompatível. Arquivo: `src/lib/engine.ts`.
3. **Modo offline** — se o Gemini falhar ou não houver chave, o texto é interpretado por palavras-chave (`src/lib/nlp.ts`) e o motor continua funcionando.

Modelos usados: Gemini 3.5 Flash, com Gemini 3.1 Flash Lite como reserva (lista `MODELS` em `gemini.ts`).

## Estrutura do código

```
src/
  app/                    páginas (App Router) e rotas da API
    page.tsx              página inicial
    assistente/ conversar/ montar/ analisar/   uma pasta por ferramenta
    api/recomendacao      motor + explicações do Gemini (Assistente)
    api/conversar         chat: resposta em texto ou build
    api/analisar-pdf      leitura de PDF/texto + parecer
  components/             partes visuais reutilizadas (ui.tsx, part-card, build-result...)
  lib/
    catalog.ts            catálogo de peças e PREÇOS DE REFERÊNCIA
    engine.ts             motor de recomendação e avaliação de builds
    nlp.ts                leitura de texto por palavras-chave (modo offline)
    api.ts                chamadas do navegador para a API (com fallback offline)
    server/gemini.ts      integração com o Gemini (só roda no servidor)
  app/globals.css         cores do tema (claro: verde/cobre; escuro: roxo/âmbar)
```

## Como contribuir

- Veja a lista de tarefas em [`PENDENCIAS.md`](PENDENCIAS.md).
- Crie uma branch para cada tarefa (`git checkout -b catalogo-precos`) e abra um Pull Request — não faça push direto na `main`.
- Este projeto usa **Next.js 16**, que mudou várias APIs. Antes de mexer em algo do Next, consulte a documentação em `node_modules/next/dist/docs/` (veja `AGENTS.md`).

## Publicação

Recomendado: **Vercel (plano Hobby, gratuito)**, que suporta as rotas da API. GitHub Pages **não** serve, porque só hospeda sites estáticos e a IA precisa rodar no servidor. Passo a passo em [`PENDENCIAS.md`](PENDENCIAS.md#publicação-na-vercel).
