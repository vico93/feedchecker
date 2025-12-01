# FeedChecker - Contexto e Diretrizes para Gemini

## 1. Visão Geral do Projeto

**FeedChecker** (anteriormente referido como FeedParser) é uma aplicação Node.js projetada para atuar como uma "ponte" entre feeds de dados (inicialmente RSS) e o Discord via Webhooks.

-   **Linguagem:** Node.js
-   **Principais Bibliotecas:** `node-cron` (agendamento), `rss-parser` (leitura de RSS), `better-sqlite3` (banco de dados), `axios` (requisições HTTP).
-   **Banco de Dados:** SQLite (via `better-sqlite3`).

## 2. Arquitetura e Estrutura de Arquivos

A estrutura modular deve ser rigorosamente respeitada:

-   **`index.js`**: Ponto de entrada principal. Inicializa o cron, carrega configurações e orquestra a execução entre fontes, destinos e armazenamento.
-   **`src/`**: Contém a lógica central.
    -   **`src/sources/`**: Módulos de busca de dados. (Ex: `rss.js`). Cada arquivo deve buscar e retornar novos itens.
    -   **`src/destinations/`**: Módulos de envio. (Ex: `discord.js` formata e envia para webhooks).
    -   **`src/storage.js`**: **Ponto ÚNICO de acesso ao banco de dados.** Todas as interações com SQLite devem passar por aqui.
-   **`destinations.json`**: Arquivo de configuração (ignorado pelo Git). Contém URLs sensíveis e configurações das "pontes".
-   **`destinations.example.json`**: Template público do arquivo de configuração. Deve ser mantido sincronizado com a estrutura do `destinations.json` (sem dados sensíveis).

## 3. Padrões de Código e Melhores Práticas

### 3.1 Estilo e Comentários
-   **Idioma:** Código em **Inglês**, Comentários em **Português (Brasil)**.
-   **Headers de Arquivo:** Todo arquivo JS deve manter/ter o seguinte cabeçalho:
    ```javascript
    /*
    ** caminho: [caminho/para/arquivo.js]
    ** últimaMod: [YYYY-MM-DD HH:MM]
    ** autor: Vico
    ** colaboração: [Nome do Modelo Gemini utilizado]
    */
    ```
    *Nota: Adicione o modelo atual à lista de colaboração se não existir, mantendo os anteriores.*

-   **Logging:** Padronize os logs para facilitar o debug:
    -   Ex: `console.error('[MODULE][ERROR] Mensagem de erro:', err);`
    -   Ex: `console.log('[RSS][INFO] Verificando feeds...');`

### 3.2 Banco de Dados
-   Nunca acesse o banco diretamente fora de `src/storage.js`.

## 4. Git e Commits

-   **Mensagens de Commit:** Sempre em **Português**.
-   **Sugestão Final:** Ao final de uma tarefa, sugira um título (com prefixo convencional: `feat:`, `fix:`, `debug:`, etc.) e uma descrição para o commit.

## 6. Comandos Úteis
-   Start: `npm start`
