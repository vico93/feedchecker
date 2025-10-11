/*
** caminho: index.js
** últimaMod: 2025-10-11 01:50
** autor: Vico
** colaboração: Gemini 2.5 Pro, Roo Sonic (xai/grok-code-fast-1), Roo
*/

import cron from 'node-cron';
import fs from 'fs/promises';
import { fetchRss } from './src/sources/rss.js';
import { sendToDiscord } from './src/destinations/discord.js';
import { getLastItem, setLastItem } from './src/storage.js';
import { startSharedServer } from './src/sources/shared.js';

/* --- INICIALIZAÇÃO --- */
console.log('[Main][INFO] ✅ FeedChecker iniciado. Aguardando a primeira execução agendada...');

/* --- CONFIGURAÇÃO DO SERVIDOR COMPARTILHADO --- */
let config;
let bridges;

try {
  // Carrega a configuração do servidor compartilhado
  try {
    config = JSON.parse(await fs.readFile('config.json', 'utf-8'));
  } catch (error) {
    console.warn('[Main][WARN] Arquivo config.json não encontrado. Usando config.example.json como padrão.');
    config = JSON.parse(await fs.readFile('config.example.json', 'utf-8'));
  }
  
  // Carrega as configurações das bridges
  bridges = JSON.parse(await fs.readFile('destinations.json', 'utf-8'));
  
  // Inicia o servidor compartilhado
  startSharedServer(config, bridges);
} catch (error) {
  console.error('[Main][ERROR] Falha ao inicializar o servidor compartilhado:', error.message);
}

/* --- LÓGICA PRINCIPAL (CRON) --- */
// Agenda a tarefa para rodar a cada 5 minutos ('*/5 * * * *').
cron.schedule('*/5 * * * *', async () => {
  console.log(`\n[Cron][INFO] 🚀 [${new Date().toLocaleString('pt-BR')}] Executando verificação de feeds...`);

  // Usa o array de bridges já carregado na inicialização
  if (!bridges) {
    console.error('[Cron][ERROR] Configuração das bridges não disponível.');
    return;
  }
    
  for (const bridge of bridges) {
    console.log(`[Cron][INFO] 🔎 Verificando fonte: ${bridge.source_url}`);
    
    // 1. Busca no banco de dados o último item processado para esta fonte.
    const lastItemId = getLastItem(bridge.source_url);

    // No futuro, um switch/case pode ser usado para diferentes `source_type`.
    // A função de fetch recebe a config inteira do bridge.
    const newPayloads = await fetchRss(bridge, lastItemId);

    if (newPayloads.length === 0) {
      console.log(`[Cron][INFO] ✔️  Nenhum item novo para ${bridge.source_url}.`);
      continue;
    }
      
    for (const item of newPayloads) {
      // A função de envio recebe a URL e o payload separadamente.
      await sendToDiscord(bridge.destination_url, item.payload);
      
      // Salva o estado no banco de dados após cada envio bem-sucedido.
      // O guid do item vem junto no objeto retornado pelo fetcher.
      setLastItem(bridge.source_url, item.guid);
      
      // Uma pequena pausa de 1 segundo para não sobrecarregar a API do Discord (rate limiting).
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`[Cron][INFO] ✔️  Fonte ${bridge.source_url} finalizada.`);
  }
});