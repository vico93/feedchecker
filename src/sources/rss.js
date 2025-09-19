/*
** caminho: src/sources/rss.js
** últimaMod: 2025-09-18 21:40
** autor: Vico
** colaboração: Gemini 2.5 Pro
*/

import Parser from 'rss-parser';

/* --- INICIALIZAÇÃO --- */

const parser = new Parser();

/* --- FUNÇÕES EXPORTADAS --- */

/**
 * Busca itens de um feed RSS, retornando apenas os que são mais novos que o último item conhecido.
 * @param {string} feedUrl - A URL do feed RSS.
 * @param {string | null} lastItemId - O ID (guid) do último item processado.
 * @returns {Promise<import('rss-parser').Item[]>} Uma lista com os novos itens, em ordem cronológica (do mais antigo para o mais novo).
 */
export async function fetchRss(feedUrl, lastItemId) {
  console.log(`[RSS][INFO] Buscando feed: ${feedUrl}`);
  try {
    const feed = await parser.parseURL(feedUrl);
    if (!feed.items?.length) {
      console.log('[RSS][WARN] Feed vazio ou inválido.');
      return [];
    }

    // A maioria dos feeds já vem em ordem cronológica inversa (mais novo primeiro).
    // O 'guid' é o identificador único mais confiável de um item no RSS.
    const lastItemIndex = lastItemId ? feed.items.findIndex(item => item.guid === lastItemId) : -1;

    let newItems = [];
    if (lastItemIndex === -1) {
      // Se não encontramos o último item (ou se é a primeira vez),
      // consideramos apenas o item mais recente para não floodar o canal.
      newItems = feed.items.slice(0, 1);
      console.log(`[RSS][INFO] Primeira verificação ou item antigo não encontrado. Pegando apenas o mais recente.`);
    } else {
      // Pegamos todos os itens *anteriores* ao último encontrado no array (que são os mais novos).
      newItems = feed.items.slice(0, lastItemIndex);
    }
    
    console.log(`[RSS][INFO] Encontrado(s) ${newItems.length} novo(s) item(ns).`);

    // Invertemos o array para processar do mais antigo para o mais novo,
    // garantindo a ordem cronológica correta e evitando pular itens.
    return newItems.reverse();

  } catch (error) {
    console.error(`[RSS][ERROR] Erro ao buscar o feed ${feedUrl}:`, error.message);
    return []; // Retorna um array vazio em caso de erro para não quebrar o loop principal.
  }
}