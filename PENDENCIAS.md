# Pendências e melhorias — SmartBuild AI

Lista de tarefas para quem for contribuir. Pegue um item, crie uma branch e abra um Pull Request. Ao terminar, marque o item com `[x]`.

Prioridades: **Alta** = resolver antes de apresentar/publicar · **Média** = melhora bastante a experiência · **Baixa** = ideia para o futuro.

---

## Alta prioridade

- [ ] **1. Atualizar os preços do catálogo** — `src/lib/catalog.ts`
  Os preços atuais são **estimativas sem pesquisa real** e provavelmente estão defasados (memória e SSD subiram bastante). Para cada item: pesquisar o preço atual na KaBuM!, Pichau e Terabyte, confirmar que o modelo é vendido no Brasil e atualizar o campo `price`. Sugestão: criar uma constante `CATALOG_UPDATED_AT` e mostrar “preços de dd/mm/aaaa” na interface.

- [ ] **2. Calibrar as notas de desempenho das peças** — `src/lib/catalog.ts`
  Os campos `gaming`, `multi`, `render` e `score` (0–100) são estimativas relativas, não benchmarks. Eles definem a escolha das peças e o FPS estimado. Calibrar com fontes como a tabela de desempenho relativo do TechPowerUp ou a hierarquia de GPUs do Tom's Hardware.

- [ ] **3. Proteger a cota do Gemini antes de publicar** — `src/app/api/*`
  Hoje qualquer pessoa pode chamar as rotas `/api/*` sem limite e gastar a cota gratuita. Adicionar limite de requisições por IP (ex.: Upstash Ratelimit, que tem plano gratuito) e uma mensagem amigável quando estourar. Usar uma chave criada só para o projeto publicado.

- [ ] **4. Imagens no site**
  Fotos das peças e ilustrações. Sugestão: salvar em `public/pecas/<id>.webp` (usando o `id` do catálogo), adicionar um campo opcional `image` em `CatalogItem` (`src/lib/types.ts`) e exibir com `next/image` no `PartCard` (`src/components/part-card.tsx`) e na página Montar. Usar imagens próprias ou de divulgação do fabricante (atenção a direitos de uso).

- [ ] **5. Testar em navegadores e aparelhos reais**
  Não foi testado clicando em navegador real: transições entre páginas (Chrome, Firefox, Safari), PDF escaneado (imagem) na página Analisar, uso no celular.

## Média prioridade

- [ ] **6. Testes automatizados**
  Não há testes; o motor e a leitura de texto foram testados só manualmente. Criar testes (ex.: Vitest) para `src/lib/engine.ts` (toda build sugerida é compatível, respeita o orçamento, funciona com vários usos) e `src/lib/nlp.ts` (“5 mil” = 5000, “4K” não é dinheiro, etc.).

- [ ] **7. Chat com resposta em streaming** — `src/app/api/conversar`, `src/lib/server/gemini.ts`
  As respostas levam 6–8 s. Com `streamText` do AI SDK o texto aparece aos poucos e a espera parece bem menor.

- [ ] **8. Salvar e compartilhar builds**
  Hoje tudo some ao recarregar a página (`src/lib/session-state.ts` guarda só na memória). Ideias: guardar no `localStorage`, link compartilhável com a build na URL, exportar em PDF (hoje é `.txt`).

- [ ] **9. Melhorar a escolha de peças na página Montar** — `src/app/montar/montar-client.tsx`
  As listas são `<select>` longos. Trocar por um campo de busca com filtro, mostrando primeiro as peças compatíveis com o que já foi escolhido.

- [ ] **10. Montar no celular**
  A avaliação da IA fica lá embaixo da lista. Criar uma barra fixa no rodapé com total + nota + atalho para a avaliação.

- [ ] **11. Opinião do Gemini na página Montar**
  Hoje essa página usa só o motor local (avaliação instantânea). Adicionar um botão “Pedir opinião da IA” sob demanda, para não esperar a cada clique.

- [ ] **12. Aviso de privacidade**
  No plano gratuito da API do Gemini, o Google pode usar o conteúdo enviado para melhorar os produtos dele. Avisar isso nas páginas de chat e de PDF (ou usar um plano pago, em que isso não acontece).

- [ ] **13. Acessibilidade**
  Revisar o contraste dos textos pequenos em cinza (`text-subtle`), a navegação só por teclado e a leitura por leitores de tela.

## Baixa prioridade / ideias

- [ ] **14. Ferramenta “Fazer upgrade do meu PC”** — informar o PC atual (ou PDF) e a IA dizer o que trocar primeiro. As peças antigas de referência já existem em `catalog.ts` (`REFERENCE_CPUS`, `REFERENCE_GPUS`).
- [ ] **15. Comparar duas builds lado a lado.**
- [ ] **16. Mais peças e categorias** — dois SSDs na mesma build, placas ITX, mais gabinetes/coolers, monitores avulsos, notebooks.
- [ ] **17. Preços automáticos** — buscar preços de alguma API ou serviço de comparação (verificar os termos de uso das lojas).
- [ ] **18. Rodar o motor em um Web Worker** — a busca testa ~300 mil combinações (~80 ms num PC); em celulares fracos pode travar a tela por um instante.
- [ ] **19. Dependência sem uso** — `@ai-sdk/openai` está instalado e não é usado: remover ou usar como reserva quando o Gemini estiver fora.
- [ ] **20. Manter a lista de modelos do Gemini em dia** — o Google aposenta modelos (o Gemini 2.5 já não responde). Se o chat começar a cair sempre no modo offline, atualizar `MODELS` em `src/lib/server/gemini.ts`.

## Problemas conhecidos

- Preços e FPS são estimativas (itens 1 e 2).
- No modo offline (sem Gemini) o texto é lido por palavras-chave: frases como “não quero jogar” são mal interpretadas. Com o Gemini ativo isso não acontece.
- Conversa e resultados somem ao recarregar a página (item 8).
- O `npm run lint` não foi rodado depois das últimas mudanças: rodar e corrigir os avisos.

---

## Publicação na Vercel

GitHub Pages **não serve** para este projeto: ele só hospeda arquivos estáticos, e as rotas `/api/*` (Gemini, leitura de PDF) precisam de um servidor. A opção recomendada é a **Vercel**, criada pelos mesmos autores do Next.js, com plano **Hobby gratuito** (para uso não comercial — trabalho acadêmico se encaixa).

1. Criar conta em <https://vercel.com> entrando com o GitHub.
2. **Add New → Project** e importar o repositório `integrativa26`. O Next.js é detectado sozinho; não precisa mudar configurações.
3. Em **Environment Variables**, adicionar `GOOGLE_GENERATIVE_AI_API_KEY` com a chave do Gemini.
4. Clicar em **Deploy**. O site fica em `https://<nome-do-projeto>.vercel.app`.
5. A partir daí, cada push na `main` publica automaticamente, e cada Pull Request ganha um link de **preview** próprio para testar antes de juntar.

Cuidados: resolver o item 3 (limite de uso) antes de divulgar o link. As rotas já declaram `maxDuration = 60` segundos, porque o Gemini leva alguns segundos para responder.

Alternativas gratuitas que também suportam Next.js com servidor: **Netlify** e **Cloudflare** (esta exige mais configuração, via OpenNext).
