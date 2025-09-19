/*
** caminho: src/destinations/discord.js
** últimaMod: 2025-09-19 11:15
** autor: Vico
** colaboração: Gemini
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
  const { destination_type, destination_tags, destination_username, destination_avatar_url } = bridgeConfig;

  const title = item.title?.trim() ?? 'Título não encontrado';
  const link = item.link ?? 'Link não encontrado';

  // Inicia o payload base com o conteúdo.
  const payload = {
    content: `**${title}**\n${link}`
  };

  // Adiciona o nome de usuário customizado APENAS se ele for fornecido.
  if (destination_username) {
    payload.username = destination_username;
  }

  // Adiciona o avatar customizado APENAS se ele for fornecido.
  if (destination_avatar_url) {
    payload.avatar_url = destination_avatar_url;
  }

  // Se o destino for um fórum, adiciona as propriedades de thread ao payload principal.
  if (destination_type === 'forum' && destination_tags?.length) {
    payload.thread_name = title.substring(0, 100);
    payload.applied_tags = destination_tags;
  }

  return payload;
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
    const errorMessage = error.response?.data || error.message;
    console.error(`[Discord][ERROR] Falha ao enviar para o webhook:`, errorMessage);
  }
}