/*
** caminho: index.js
** últimaMod: 2025-09-18 21:40
** autor: Vico
** colaboração: Gemini 2.5 Pro
*/

import cron from 'node-cron';
import fs from 'fs/promises';
import { fetchRss } from './src/sources/rss.js';
import { sendToDiscord } from './src/destinations/discord.js';
import { getLastItem, setLastItem } from './src/storage.js';

/* --- INICIALIZAÇÃO --- */

console.log('[Main][INFO] ✅ Feedchecker 2.0 iniciado. Aguardando a primeira execução agendada...');

/* --- LÓGICA PRINCIPAL (CRON) --- */

// Agenda a tarefa para rodar a cada 5 minutos ('*/5 * * * *').
cron.schedule('*/5 * * * *', async () => {
  console.log(`\n[Cron][INFO] 🚀 [${new Date().toLocaleString('pt-BR')}] Executando verificação de feeds...`);

  let config;
  try {
    config = JSON.parse(await fs.readFile('config.json', 'utf-8'));
  } catch (error) {
    console.error('[Cron][ERROR] Erro ao ler o arquivo "config.json". Verifique se ele existe e está correto.', error.message);
    return; // Para a execução da tarefa se não conseguir ler a configuração.
  }
    
  for (const bridge of config) {
    console.log(`[Cron][INFO] 🔎 Verificando fonte: ${bridge.source_url}`);
    
    // 1. Busca no banco de dados o último item processado para esta fonte.
    const lastItemId = getLastItem(bridge.source_url);

    // 2. Busca os novos itens do feed.
    // No futuro, um switch/case pode ser usado para diferentes `source_type`.
    const newItems = await fetchRss(bridge.source_url, lastItemId);

    if (newItems.length === 0) {
      console.log(`[Cron][INFO] ✔️  Nenhum item novo para ${bridge.source_url}.`);
      continue; // Pula para a próxima "ponte" da configuração.
    }
      
    // 3. Itera sobre os novos itens, envia para o Discord e atualiza o banco.
    for (const item of newItems) {
      await sendToDiscord(bridge, item);
      
      // Salva o estado no banco de dados após cada envio bem-sucedido.
      // O 'guid' é a propriedade mais confiável para ID único em feeds RSS.
      setLastItem(bridge.source_url, item.guid);
      
      // Uma pequena pausa de 1 segundo para não sobrecarregar a API do Discord (rate limiting).
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`[Cron][INFO] ✔️  Fonte ${bridge.source_url} finalizada.`);
  }
});