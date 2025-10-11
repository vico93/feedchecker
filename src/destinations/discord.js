/*
** caminho: src/destinations/discord.js
** últimaMod: 2025-10-11 01:51
** autor: Vico
** colaboração: Gemini 2.5 Pro, Roo
*/

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Verifica se fetch está disponível (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('[Discord][ERROR] fetch não está disponível. Este módulo requer Node.js 18+.');
}

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

/**
 * Envia um payload com um arquivo para um webhook do Discord.
 * @param {string} webhookUrl - A URL do webhook de destino.
 * @param {object} payload - O objeto de payload já formatado.
 * @param {string} filePath - O caminho do arquivo a ser enviado.
 * @param {string} fileFieldName - O nome do campo do arquivo (default: "file").
 * @param {string} fileName - O nome do arquivo a ser enviado (default: basename do filePath).
 */
export async function sendToDiscordWithFile(webhookUrl, payload, filePath, fileFieldName = "file", fileName) {
  try {
    // Se não for fornecido um nome de arquivo, usa o basename do caminho
    if (!fileName) {
      fileName = path.basename(filePath);
    }

    // Cria um FormData para envio multipart
    const form = new FormData();
    
    // Adiciona o payload JSON como um campo
    form.append('payload_json', JSON.stringify(payload));
    
    // Adiciona o arquivo
    const fileStream = fs.createReadStream(filePath);
    form.append(fileFieldName, fileStream, fileName);

    // Envia a requisição usando fetch (Node 18+)
    const response = await fetch(webhookUrl, {
      method: 'POST',
      body: form,
      // Não definimos Content-Type manualmente, o fetch com FormData define corretamente com boundary
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    console.log(`[Discord][SUCCESS] Payload com arquivo enviado com sucesso.`);
  } catch (error) {
    console.error(`[Discord][ERROR] Falha ao enviar payload com arquivo para o webhook:`, error.message);
    throw error; // Re-throw para que o chamador possa tratar
  }
}