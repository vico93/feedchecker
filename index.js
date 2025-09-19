// index.js
import cron from 'node-cron';
import fs from 'fs/promises';
// Futuramente, importaremos as outras partes aqui
// import { fetchRss } from './src/sources/rss.js';
// import { sendToDiscord } from './src/destinations/discord.js';
// import { getLastItem, setLastItem } from './src/storage.js';

console.log('✅ Feedchecker iniciado. Aguardando a primeira execução agendada...');

// Agenda a tarefa para rodar a cada 5 minutos.
// Você pode ajustar a expressão cron aqui. '*/5 * * * *' = a cada 5 minutos.
cron.schedule('*/5 * * * *', async () => {
  console.log(`\n[${new Date().toLocaleString('pt-BR')}] 🚀 Executando verificação de feeds...`);

  try {
    const config = JSON.parse(await fs.readFile('config.json'));
    
    for (const bridge of config) {
      console.log(`🔎 Verificando fonte: ${bridge.source_url}`);
      
      // --- AQUI VAI ENTRAR A LÓGICA PRINCIPAL ---
      // 1. Chamar o storage.js para pegar o último item
      // const lastItemId = getLastItem(bridge.source_url);

      // 2. Chamar o módulo de source apropriado para buscar novos itens
      // const newItems = await fetchRss(bridge.source_url, lastItemId);

      // 3. Iterar sobre os novos itens e enviar para o Discord
      // for (const item of newItems) {
      //   await sendToDiscord(bridge, item);
      //   setLastItem(bridge.source_url, item.guid);
      // }
      
      console.log(`✔️  Fonte ${bridge.source_url} verificada.`);
    }

  } catch (error) {
    console.error('🔥 Erro no ciclo de verificação:', error);
  }
});