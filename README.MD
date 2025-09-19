# FeedChecker

Feedchecker, só que agora em Node.JS

## Estrutura

-   `index.js`: O ponto de entrada principal. Responsável por inicializar o agendador de tarefas (`cron`), ler a configuração e orquestrar a execução dos módulos de fonte, destino e armazenamento.
-   `src/`: Contém toda a lógica principal e abstrações da aplicação.
    -   `sources/`: Contém os módulos para buscar dados de diferentes fontes. Atualmente, possui o `rss.js` para feeds RSS. Cada arquivo aqui deve ser capaz de buscar e retornar uma lista de novos itens de uma fonte específica.
    -   `destinations/`: Contém os módulos para enviar dados aos destinos configurados. O `discord.js` é responsável por formatar e enviar as mensagens para os webhooks do Discord.
    -   `storage.js`: O módulo de acesso ao banco de dados SQLite. **Todas as interações com o banco de dados DEVEM passar por este arquivo.**
-   `config.json`: Armazena **todas** as configurações para as "pontes" (bridges), como URLs de fontes e webhooks de destino. **NUNCA** adicione informações sensíveis (chaves de API, tokens) diretamente no código.
-   `config.example.json`: Como o `config.json` é um arquivo privado e sensível (e está ignorado pelo Git), este arquivo serve como um "template". Ele mostra a estrutura necessária para o `config.json` sem conter nenhuma URL ou dado privado. Se você fizer qualquer alteração na estrutura do `config.json`, deve replicá-la aqui (sem os dados privados).

## Instalação

### Pré-requisitos

-   Node.js (v20.x ou superior é recomendado)
-   npm (geralmente instalado junto com o Node.js)

### Instalação e Configuração

1.  **Clone o repositório:**
    ```bash
    git clone [https://github.com/vico93/feedchecker.git](https://github.com/vico93/feedchecker.git) --branch remake
    cd feedchecker
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Crie seu arquivo de configuração:**
    -   Copie o arquivo de configuração de exemplo:
        ```bash
        cp config.example.json config.json
        ```
    -   Abra o `config.json` e substitua os valores de exemplo pelas suas URLs reais de feeds RSS e webhooks do Discord.

### Uso

Assim que o arquivo `config.json` estiver configurado corretamente, simplesmente rode o script de início:

```bash
npm start
```

O script será iniciado, e a primeira verificação será agendada para rodar de acordo com o intervalo definido no `index.js` (o padrão é a cada 5 minutos).

## Licença

Este projeto é licenciado sob a Licença MIT.