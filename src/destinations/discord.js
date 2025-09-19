/*
** caminho: src/destinations/discord.js
** últimaMod: 2025-09-19 11:05
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
  // Desestrutura os campos que podemos usar da configuração.
  const { destination_type, destination_tags, destination_username, destination_avatar_url } = bridgeConfig;

  // Limpeza e normalização dos dados do item do feed.
  const title = item.title?.trim() ?? 'Título não encontrado';
  const link = item.link ?? 'Link não encontrado';

  // Inicia o payload base apenas com o conteúdo, que é sempre necessário.
  const baseMessage = {
    content: `**${title}**\n${link}`
  };

  // Adiciona o nome de usuário customizado APENAS se ele for fornecido na config.
  // Se não for, o webhook usará seu nome padrão configurado no Discord.
  if (destination_username) {
    baseMessage.username = destination_username;
  }

  // Adiciona o avatar customizado APENAS se ele for fornecido na config.
  // Se não for, o webhook usará seu avatar padrão configurado no Discord.
  if (destination_avatar_url) {
    baseMessage.avatar_url = destination_avatar_url;
  }

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