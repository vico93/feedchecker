/*
** caminho: src/destinations/discord.js
** últimaMod: 2025-09-18 21:40
** autor: Vico
** colaboração: Gemini 2.5 Pro
*/

import axios from 'axios';

/* --- FUNÇÕES INTERNAS --- */

/**
 * Monta o payload correto para o webhook do Discord baseado no tipo de canal.
 * @param {object} bridgeConfig - A configuração da ponte (do config.json).
 * @param {import('rss-parser').Item} item - O item do feed a ser enviado.
 * @returns {object} O payload pronto para ser enviado para a API do Discord.
 */
function buildDiscordPayload(bridgeConfig, item) {
  const { destination_type, destination_tags } = bridgeConfig;

  // Limpeza e normalização dos dados do item do feed.
  const title = item.title?.trim() ?? 'Título não encontrado';
  const link = item.link ?? 'Link não encontrado';

  // Payload base, comum a todos os tipos de mensagem.
  const baseMessage = {
    username: item.creator || item.author || item.title.substring(0, 80) || 'Feed Checker',
    avatar_url: "https://i.imgur.com/R66g1Pe.png", 
    content: `**${title}**\n${link}`
  };

  // Se o destino for um fórum e tiver tags definidas, monta um payload de criação de thread.
  if (destination_type === 'forum' && destination_tags?.length) {
    return {
      thread_name: title.substring(0, 100), // Título da thread (limite de 100 caracteres)
      message: baseMessage,
      applied_tags: destination_tags
    };
  }

  // Caso contrário, retorna o payload de mensagem simples.
  return baseMessage;
}

/* --- FUNÇÕES EXPORTADAS --- */

/**
 * Envia um item para um webhook do Discord.
 * @param {object} bridgeConfig - A configuração da ponte (do config.json).
 * @param {import('rss-parser').Item} item - O item do feed a ser enviado.
 */
export async function sendToDiscord(bridgeConfig, item) {
  const payload = buildDiscordPayload(bridgeConfig, item);
  
  try {
    await axios.post(bridgeConfig.destination_url, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log(`[Discord][SUCCESS] Item "${item.title}" enviado com sucesso.`);
  } catch (error) {
    // Log detalhado do erro, mostrando a resposta da API do Discord se disponível.
    const errorMessage = error.response?.data || error.message;
    console.error(`[Discord][ERROR] Falha ao enviar para o webhook:`, errorMessage);
  }
}