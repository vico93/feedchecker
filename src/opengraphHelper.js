/*
** caminho: src/opengraphHelper.js
** últimaMod: 2025-10-11 02:32
** autor: Vico
** colaboração: Roo Sonic (xai/grok-code-fast-1)
*/

import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Busca dados Open Graph (og:title e og:description) de uma URL
 * @param {string} url - URL para extrair os dados Open Graph
 * @returns {Promise<{title: string|null, description: string|null}>} - Objeto com título e descrição
 */
export async function fetchOpenGraphData(url) {
  try {
    /* --- Faz a requisição HTTP para obter o HTML da página --- */
    const response = await axios.get(url, {
      timeout: 10000, // Timeout de 10 segundos
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    /* --- Carrega o HTML no Cheerio para parsing --- */
    const $ = cheerio.load(response.data);
    
    /* --- Extrai as meta tags do Open Graph --- */
    const title = $('meta[property="og:title"]').attr('content') || null;
    const description = $('meta[property="og:description"]').attr('content') || null;
    
    return { title, description };
  } catch (error) {
    /* --- Registra o erro no console e retorna um objeto com valores nulos --- */
    console.error('[OPENGRAPHHELPER][ERROR] Erro ao buscar dados Open Graph:', error.message);
    return { title: null, description: null };
  }
}