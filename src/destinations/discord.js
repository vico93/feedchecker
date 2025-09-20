/*
** caminho: src/destinations/discord.js
** últimaMod: 2025-09-20 20:05
** autor: Vico
** colaboração: Gemini 2.5 Pro
*/

import axios from 'axios';

/* --- FUNÇÕES EXPORTADAS --- */

/**
 * Envia um payload pré-montado para um webhook do Discord.
 * @param {string} webhookUrl - A URL do webhook de destino.
 * @param {object} payload - O objeto de payload já formatado.
 */
export async function sendToDiscord(webhookUrl, payload) {
  try {
    await axios.post(webhookUrl, payload, {
      headers: { 'Content-Type': 'application/json' }
    });
    // O log agora é mais genérico, pois não sabe o "título" do item.
    console.log(`[Discord][SUCCESS] Payload enviado com sucesso.`);
  } catch (error) {
    const errorMessage = error.response?.data || error.message;
    console.error(`[Discord][ERROR] Falha ao enviar para o webhook:`, errorMessage);
  }
}