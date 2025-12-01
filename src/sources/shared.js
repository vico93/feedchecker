/*
** caminho: src/sources/shared.js
** últimaMod: 2025-10-11 18:17
** autor: Vico
** colaboração: GLM 4.5, Roo Sonic (xai/grok-code-fast-1)
*/

import http from 'http';
import fs from 'fs/promises';
import path from 'path';
import { isInstagramUrl, downloadInstagramVideo, cleanupFile, getInstagramDescription } from '../utils/uInstagram.js';
import { isRedditUrl, getRedditPostInfo } from '../utils/uReddit.js';
import { sendToDiscord, sendToDiscordWithFile } from '../destinations/discord.js';
import { fetchOpenGraphData } from '../utils/uOpengraph.js';

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
        content: `[LINK](${url})`
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
            // Tenta obter a descrição real do post usando yt-dlp
            const igDescription = await getInstagramDescription(url);
            
            /* --- Busca dados Open Graph para enriquecer a postagem --- */
            const ogData = await fetchOpenGraphData(url);
            
            // Define o título do thread usando og:title ou fallback para deriveTitle
            if (ogData.title && ogData.title.trim() && ogData.title !== 'Instagram') {
              payload.thread_name = ogData.title;
            } else {
              payload.thread_name = deriveTitle(url);
            }
            
            // Adiciona a descrição ao conteúdo (prioriza a do yt-dlp, fallback para OG)
            const descriptionToAdd = igDescription || ogData.description;
            
            if (descriptionToAdd && descriptionToAdd.trim()) {
              payload.content = `${descriptionToAdd}\n\n${payload.content}`;
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
      } else if (isRedditUrl(url)) {
        /* --- Tratamento específico para URLs do Reddit --- */
        console.log('[Shared][INFO] Enriquecendo link do Reddit via JSON...');
        
        try {
          // Busca informações do post do Reddit
          const info = await getRedditPostInfo(url);
          
          // Adiciona aviso NSFW se necessário
          if (info.isNSFW) {
            payload.content = '🔞 NSFW\n' + payload.content;
          }
          
          // Prepara o conteúdo com base no texto do post
          if (info.text && info.text.trim()) {
            // Trunca o texto se for muito longo
            const excerpt = info.text.length > 1000
              ? info.text.substring(0, 1000) + '...'
              : info.text;
            payload.content = excerpt + '\n\n' + '[FONTE](' + info.url + ')';
          } else {
            payload.content = '[FONTE](' + info.url + ')';
          }
          
          // Para fóruns, define o nome do thread e tags
          if (bridge.destination_type === 'forum') {
            payload.thread_name = info.title || deriveTitle(url);
            if (bridge.destination_tags) {
              payload.applied_tags = bridge.destination_tags;
            }
          }
          
          // Prepara o embed com informações do Reddit
          const embed = {
            title: info.title,
            url: info.url,
            footer: { text: `r/${info.subreddit} • u/${info.author}` }
          };
          
          // Adiciona imagem ao embed se existir
          if (info.imageUrl) {
            embed.image = { url: info.imageUrl };
          }
          
          // Se for vídeo, adiciona link no conteúdo (não usa embed.video)
          if (info.videoUrl) {
            payload.content += '\n🎞️ Vídeo: ' + info.videoUrl;
          }
          
          // Se for galeria, usa primeira imagem no embed e lista as demais
          if (info.galleryImages && info.galleryImages.length > 0) {
            // Se não tem imageUrl, usa a primeira imagem da galeria
            if (!info.imageUrl) {
              embed.image = { url: info.galleryImages[0] };
            }
            
            // Adiciona as imagens restantes ao conteúdo
            for (let i = (info.imageUrl ? 0 : 1); i < info.galleryImages.length; i++) {
              payload.content += '\n🖼️ ' + info.galleryImages[i];
            }
          }
          
          // Adiciona o embed ao payload se tiver conteúdo útil
          if (embed.title && embed.url) {
            payload.embeds = [embed];
          }
          
          // Envia para o Discord
          await sendToDiscord(bridge.destination_url, payload);
          
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('OK: Link do Reddit enviado para o Discord.');
          
          console.log('[Shared][SUCCESS] Link do Reddit enviado ao Discord.');
        } catch (error) {
          console.error('[Shared][ERROR] Falha ao enriquecer/enviar Reddit:', error.message);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('ERRO: Falha ao processar link do Reddit.');
          return;
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