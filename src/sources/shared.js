/*
** caminho: src/sources/shared.js
** últimaMod: 2025-10-11 05:38
** autor: Vico
** colaboração: GLM 4.5, Roo Sonic (xai/grok-code-fast-1)
*/

import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { isInstagramUrl, downloadInstagramVideo, cleanupFile } from '../instagramHelper.js';
import { sendToDiscord, sendToDiscordWithFile } from '../destinations/discord.js';
import { fetchOpenGraphData } from '../opengraphHelper.js';

/* --- FUNÇÕES AUXILIARES --- */

/**
 * Deriva um título a partir da URL para usar como nome do thread.
 * @param {string} url - A URL de origem.
 * @returns {string} - O título derivado.
 */
function deriveTitle(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.replace('www.', '');
    
    // Pega o último segmento não vazio do caminho
    const pathSegments = urlObj.pathname.split('/').filter(segment => segment.length > 0);
    const segment = pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : '';
    
    let title = `Compartilhado: ${hostname}`;
    if (segment) {
      title += ` / ${segment}`;
    }
    
    // Limita a 100 caracteres
    return title.length > 100 ? title.substring(0, 97) + '...' : title;
  } catch (e) {
    return 'Compartilhado';
  }
}

/* --- FUNÇÕES EXPORTADAS --- */

/**
 * Inicia o servidor HTTP compartilhado para receber links.
 * @param {object} config - A configuração do servidor.
 * @param {Array} bridges - A lista de bridges configuradas.
 */
export function startSharedServer(config, bridges) {
  // Filtra apenas as bridges do tipo "shared"
  const sharedBridges = bridges.filter(bridge => bridge.source_type === 'shared');
  
  // Validação dos endpoints
  const endpoints = new Map();
  const endpointRegex = /^[a-zA-Z0-9._-]+$/;
  
  for (const bridge of sharedBridges) {
    if (!bridge.source_endpoint || !endpointRegex.test(bridge.source_endpoint)) {
      console.error(`[Shared][ERROR] Endpoint inválido: "${bridge.source_endpoint}". Apenas caracteres alfanuméricos, ponto, sublinhado e hífen são permitidos.`);
      continue;
    }
    
    if (endpoints.has(bridge.source_endpoint)) {
      console.error(`[Shared][ERROR] Endpoint duplicado: "${bridge.source_endpoint}". Cada endpoint deve ser único.`);
      continue;
    }
    
    endpoints.set(bridge.source_endpoint, bridge);
  }
  
  // Se não há endpoints válidos, não inicia o servidor
  if (endpoints.size === 0) {
    console.log('[Shared][INFO] Nenhum endpoint compartilhado válido configurado. Servidor não iniciado.');
    return;
  }
  
  // Cria o servidor HTTP
  const server = http.createServer(async (req, res) => {
    // Apenas aceita POST
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      return res.end('ERRO: Método não permitido. Use POST.');
    }
    
    // Extrai o endpoint da URL
    const urlParts = req.url.split('/');
    let endpoint;
    
    // Verifica se o URL começa com /share/
    if (urlParts[1] === 'share' && urlParts[2]) {
      endpoint = urlParts[2]; // Usa o segmento após /share/
    } else {
      endpoint = urlParts[1]; // Mantém compatibilidade com o formato antigo
    }
    
    // Verifica se o endpoint existe
    if (!endpoint || !endpoints.has(endpoint)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('ERRO: Endpoint não configurado.');
    }
    
    const bridge = endpoints.get(endpoint);
    
    // Verifica o Content-Type
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      res.writeHead(415, { 'Content-Type': 'text/plain' });
      return res.end('ERRO: Content-Type deve ser application/json.');
    }
    
    // Verifica o tamanho do corpo (limite de 64KB)
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > 65536) { // 64KB
      res.writeHead(413, { 'Content-Type': 'text/plain' });
      return res.end('ERRO: Corpo da requisição muito grande.');
    }
    
    // Verifica o token, se configurado
    if (config.token !== null) {
      const token = req.headers['x-share-token'];
      if (token !== config.token) {
        res.writeHead(401, { 'Content-Type': 'text/plain' });
        return res.end('ERRO: Token inválido.');
      }
    }
    
    try {
      // Lê o corpo da requisição
      const bodyData = [];
      for await (const chunk of req) {
        bodyData.push(chunk);
      }
      const body = Buffer.concat(bodyData).toString();
      const { url } = JSON.parse(body);
      
      if (!url || typeof url !== 'string') {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        return res.end('ERRO: Corpo inválido; esperado JSON com atributo "url".');
      }
      
      console.log(`[Shared][INFO] POST ${req.url} url=${url}`);
      
      // Prepara o payload base
      const payload = {
        content: `➡️ ${url}`
      };
      
      // Adiciona username e avatar_url se fornecidos
      if (bridge.username) payload.username = bridge.username;
      if (bridge.avatar_url) payload.avatar_url = bridge.avatar_url;
      
      // Trata URLs do Instagram
      if (isInstagramUrl(url)) {
        console.log('[Shared][INFO] Baixando vídeo do Instagram...');
        
        try {
          // Baixa o vídeo
          const { filePath, sizeBytes } = await downloadInstagramVideo(
            url, 
            config.temp_dir, 
            config.max_file_size_bytes
          );
          
          // Se for forum, adiciona thread_name e applied_tags
          if (bridge.destination_type === 'forum') {
            /* --- Busca dados Open Graph para enriquecer a postagem --- */
            const ogData = await fetchOpenGraphData(url);
            
            // Define o título do thread usando og:title ou fallback para deriveTitle
            if (ogData.title && ogData.title.trim()) {
              payload.thread_name = ogData.title;
            } else {
              payload.thread_name = deriveTitle(url);
            }
            
            // Adiciona a descrição Open Graph ao conteúdo, se existir
            if (ogData.description && ogData.description.trim()) {
              payload.content = `${ogData.description}\n\n${payload.content}`;
            }
            
            if (bridge.destination_tags) {
              payload.applied_tags = bridge.destination_tags;
            }
          }
          
          // Envia para o Discord com o arquivo
          await sendToDiscordWithFile(
            bridge.destination_url, 
            payload, 
            filePath
          );
          
          // Limpa o arquivo
          await cleanupFile(filePath);
          
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('OK: Vídeo do Instagram enviado para o Discord.');
        } catch (error) {
          // Trata erro de tamanho excedido
          if (error.code === 'MAX_SIZE_EXCEEDED') {
            console.warn(`[Shared][WARN] Vídeo excede limite (size=${error.size}B > max=${error.maxSize}B).`);
            res.writeHead(413, { 'Content-Type': 'text/plain' });
            res.end('ERRO: Arquivo maior que o limite configurado.');
            return;
          }
          
          // Outros erros
          throw error;
        }
      } else {
        console.log('[Shared][INFO] Enviando link para Discord...');
        
        // Se for forum, adiciona thread_name e applied_tags
        if (bridge.destination_type === 'forum') {
          /* --- Busca dados Open Graph para enriquecer a postagem --- */
          const ogData = await fetchOpenGraphData(url);
          
          // Define o título do thread usando og:title ou fallback para deriveTitle
          if (ogData.title && ogData.title.trim()) {
            payload.thread_name = ogData.title;
          } else {
            payload.thread_name = deriveTitle(url);
          }
          
          // Adiciona a descrição Open Graph ao conteúdo, se existir
          if (ogData.description && ogData.description.trim()) {
            payload.content = `${ogData.description}\n\n${payload.content}`;
          }
          
          if (bridge.destination_tags) {
            payload.applied_tags = bridge.destination_tags;
          }
        }
        
        // Envia para o Discord sem arquivo
        await sendToDiscord(bridge.destination_url, payload);
        
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK: Enviado para o Discord.');
      }
      
      console.log('[Shared][SUCCESS] Enviado ao Discord.');
    } catch (error) {
      console.error('[Shared][ERROR] Falha ao processar a solicitação:', error.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('ERRO: Falha ao processar a solicitação.');
    }
  });
  
  // Inicia o servidor
  server.listen(config.port, config.bind_host, () => {
    console.log(`[Shared][INFO] Servidor compartilhado iniciado em ${config.bind_host}:${config.port}`);
    console.log(`[Shared][INFO] Endpoints registrados: ${Array.from(endpoints.keys()).join(', ')}`);
  });
  
  // Trata erros do servidor
  server.on('error', (error) => {
    console.error('[Shared][ERROR] Erro no servidor:', error.message);
  });
  
  return server;
}