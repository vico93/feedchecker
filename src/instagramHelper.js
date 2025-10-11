/*
** caminho: src/instagramHelper.js
** últimaMod: 2025-10-11 03:06
** autor: Vico
** colaboração: GLM 4.5, Grok Code (Fast)
*/

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

/* --- FUNÇÕES EXPORTADAS --- */

/**
 * Verifica se a URL é do Instagram.
 * @param {string} url - A URL a ser verificada.
 * @returns {boolean} - True se for uma URL do Instagram.
 */
export function isInstagramUrl(url) {
  try {
    const urlObj = new URL(url);
    const instagramHosts = ['instagram.com', 'www.instagram.com', 'm.instagram.com'];
    const instagramPaths = ['/p', '/reel', '/reels', '/tv'];
    
    return instagramHosts.includes(urlObj.hostname) &&
           instagramPaths.some(path => urlObj.pathname.startsWith(path));
  } catch (e) {
    return false;
  }
}

/**
 * Baixa um vídeo do Instagram usando yt-dlp.
 * @param {string} url - A URL do vídeo do Instagram.
 * @param {string} tempDir - O diretório temporário para salvar o vídeo.
 * @param {number} maxBytes - O tamanho máximo permitido para o arquivo em bytes.
 * @returns {Promise<{filePath: string, sizeBytes: number}>} - O caminho do arquivo e o tamanho.
 */
export async function downloadInstagramVideo(url, tempDir, maxBytes) {
  try {
    // Garante que o diretório temporário exista
    await fs.mkdir(tempDir, { recursive: true });
    
    console.log(`[InstagramHelper][INFO] Baixando vídeo do Instagram: ${url}`);
    
    // Gera um padrão de arquivo único para esta sessão
    const outputPattern = path.join(tempDir, `%(id)s.%(ext)s`);
    
    // Spawna o processo yt-dlp
    const ytDlp = spawn('yt-dlp', [
      '--no-playlist',
      '-o', outputPattern,
      url
    ]);
    
    // Captura stderr para logs
    let stderrData = '';
    ytDlp.stderr.on('data', (data) => {
      stderrData += data.toString();
    });
    
    // Aguarda a conclusão do processo
    await new Promise((resolve, reject) => {
      ytDlp.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`yt-dlp exited with code ${code}: ${stderrData}`));
        }
      });
      
      ytDlp.on('error', (error) => {
        reject(error);
      });
    });
    
    // Encontra o arquivo baixado (usando uma abordagem mais simples)
    const files = await fs.readdir(tempDir);
    if (files.length === 0) {
      throw new Error('Nenhum arquivo encontrado após o download');
    }
    
    // Pega o primeiro arquivo encontrado (deve ser o que acabamos de baixar)
    const filePath = path.join(tempDir, files[0]);
    const stats = await fs.stat(filePath);
    
    // Verifica o tamanho do arquivo
    if (stats.size > maxBytes) {
      await cleanupFile(filePath);
      const error = new Error(`Arquivo maior que o limite configurado`);
      error.code = 'MAX_SIZE_EXCEEDED';
      error.size = stats.size;
      error.maxSize = maxBytes;
      throw error;
    }
    
    // Valida a extensão do arquivo
    const validExtensions = ['.mp4', '.mov', '.mkv'];
    const ext = path.extname(filePath).toLowerCase();
    if (!validExtensions.includes(ext)) {
      await cleanupFile(filePath);
      throw new Error(`Extensão de arquivo não suportada: ${ext}`);
    }
    
    console.log(`[InstagramHelper][SUCCESS] Vídeo baixado: ${filePath} (${stats.size} bytes)`);
    
    return {
      filePath,
      sizeBytes: stats.size
    };
  } catch (error) {
    console.error(`[InstagramHelper][ERROR] Falha ao baixar vídeo do Instagram:`, error.message);
    throw error;
  }
}

/**
 * Remove um arquivo de forma segura.
 * @param {string} filePath - O caminho do arquivo a ser removido.
 */
export async function cleanupFile(filePath) {
  try {
    await fs.unlink(filePath);
    console.log(`[InstagramHelper][INFO] Arquivo removido: ${filePath}`);
  } catch (error) {
    console.error(`[InstagramHelper][ERROR] Falha ao remover arquivo ${filePath}:`, error.message);
  }
}