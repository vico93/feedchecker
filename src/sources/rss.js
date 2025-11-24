/*
** caminho: src/sources/rss.js
** últimaMod: 2025-09-20 20:05
** autor: Vico
** colaboração: Gemini 2.5 Pro
*/

import Parser from 'rss-parser';
import TurndownService from 'turndown';

/* --- INICIALIZAÇÃO --- */
const parser = new Parser();
const turndownService = new TurndownService();

/* --- FUNÇÕES INTERNAS --- */

/**
 * Monta um payload de webhook para um item de feed RSS.
 * @param {import('rss-parser').Item} item - O item do feed.
 * @param {object} bridgeConfig - A configuração da ponte.
 * @returns {object} O payload pronto para ser enviado.
 */
function buildPayloadFromRssItem(item, bridgeConfig) {
  const { destination_type, destination_tags, destination_username, destination_avatar_url } = bridgeConfig;

  const title = item.title?.trim() ?? 'Título não encontrado';
  const link = item.link ?? 'Link não encontrado';
  const contentAsMarkdown = item.content ? turndownService.turndown(item.content) : '';
  const truncatedContent = contentAsMarkdown.substring(0, 1800);

  const payload = {
    content: `${truncatedContent}\n\n*[FONTE](${link})*`
  };

  if (destination_username) payload.username = destination_username;
  if (destination_avatar_url) payload.avatar_url = destination_avatar_url;

  if (destination_type === 'forum' && destination_tags?.length) {
    payload.thread_name = title.substring(0, 100);
    payload.applied_tags = destination_tags;
  }

  return payload;
}

/* --- FUNÇÕES EXPORTADAS --- */

/**
 * Busca itens de um feed RSS e os converte em payloads prontos para o Discord.
 * @param {object} bridgeConfig - A configuração completa da ponte.
 * @param {string | null} lastItemId - O ID (guid) do último item processado.
 * @returns {Promise<Array<{payload: object, guid: string}>>} Uma lista de objetos, cada um com o payload e o guid do item.
 */
export async function fetchRss(bridgeConfig, lastItemId) {
  const { source_url } = bridgeConfig;
  console.log(`[RSS][INFO] Buscando feed: ${source_url}`);
  try {
    const feed = await parser.parseURL(source_url);
    if (!feed.items?.length) return [];

    const lastItemIndex = lastItemId ? feed.items.findIndex(item => item.guid === lastItemId) : -1;
    let newItems = (lastItemIndex === -1)
      ? feed.items.slice(0, 1) // Primeira vez, pega só o mais recente
      : feed.items.slice(0, lastItemIndex);

    if (newItems.length > 0) {
      console.log(`[RSS][INFO] Encontrado(s) ${newItems.length} novo(s) item(ns).`);
    }

    // Inverte para processar do mais antigo pro mais novo e mapeia para o formato de payload.
    return newItems.reverse().map(item => ({
      payload: buildPayloadFromRssItem(item, bridgeConfig),
      guid: item.guid // Retornamos o guid junto para o index.js saber o que salvar no banco.
    }));

  } catch (error) {
    console.error(`[RSS][ERROR] Erro ao buscar o feed ${source_url}:`, error.message);
    return [];
  }
}