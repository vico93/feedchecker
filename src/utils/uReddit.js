/*
** caminho: src/utils/uReddit.js
** últimaMod: 2025-10-11 18:17
** autor: Vico
** colaboração: GLM 4.5, GPT-5
*/

/* --- Funções utilitárias para extração de dados de posts do Reddit --- */

/**
 * Verifica se a URL é de um post do Reddit
 * @param {string} url - URL para verificar
 * @returns {boolean} - True se for URL do Reddit
 */
export function isRedditUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Verifica domínios do Reddit
    if (hostname === 'reddit.com' || 
        hostname === 'www.reddit.com' || 
        hostname === 'old.reddit.com' || 
        hostname === 'new.reddit.com' ||
        hostname === 'redd.it') {
      return true;
    }
    
    return false;
  } catch (e) {
    // Se não for uma URL válida, retorna false
    return false;
  }
}

/**
 * Busca e extrai informações de um post do Reddit via API JSON não oficial
 * @param {string} url - URL do post do Reddit
 * @returns {Promise<Object>} - Objeto com informações do post
 * @throws {Error} - Lança erro em caso de falha na requisição ou parsing
 */
export async function getRedditPostInfo(url) {
  try {
    // Garante que a URL termina com .json, preservando querystring e trailing slash
    let jsonUrl = url;
    if (!jsonUrl.endsWith('.json')) {
      // Remove trailing slash se existir para evitar duplicação
      jsonUrl = jsonUrl.replace(/\/$/, '');
      jsonUrl += '.json';
    }
    
    console.log(`[Reddit][INFO] Buscando dados do post: ${jsonUrl}`);
    
    // Faz a requisição com User-Agent adequado
    const response = await fetch(jsonUrl, {
      headers: {
        'User-Agent': 'FeedParser/1.0 (+shared-link-bridge; contact: console)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Falha na requisição: Status ${response.status}`);
    }
    
    const data = await response.json();
    
    // Verifica se a estrutura JSON é a esperada
    if (!data[0] || !data[0].data || !data[0].data.children || !data[0].data.children[0]) {
      throw new Error('Estrutura JSON inválida: post não encontrado');
    }
    
    // Obtém o objeto do post
    let post = data[0].data.children[0].data;
    
    // Lidar com crosspost: usa o post original se existir
    if (post.crosspost_parent_list?.[0]) {
      console.log(`[Reddit][INFO] Post é crosspost, usando dados do original`);
      post = post.crosspost_parent_list[0];
    }
    
    // Extrai campos básicos
    const title = post.title || '';
    const text = post.selftext && post.selftext.trim() ? post.selftext : null;
    const author = post.author || '';
    const subreddit = post.subreddit || '';
    const isNSFW = post.over_18 || false;
    const createdUtc = post.created_utc || 0;
    const score = post.score || 0;
    const numComments = post.num_comments || 0;
    const permalink = post.permalink || '';
    const postUrl = `https://reddit.com${permalink}`;
    
    // Inicializa campos de mídia
    let imageUrl = null;
    let videoUrl = null;
    let galleryImages = [];
    let type = 'unknown';
    
    /* --- Determina o tipo de post e extrai mídia --- */
    
    // Verifica se é uma galeria
    if (post.is_gallery) {
      type = 'gallery';
      
      if (post.gallery_data && post.gallery_data.items && post.media_metadata) {
        for (const item of post.gallery_data.items) {
          const mediaId = item.media_id;
          const metadata = post.media_metadata[mediaId];
          
          if (metadata && metadata.s) {
            // Decodifica entidades HTML na URL
            let imageUrl = metadata.s.u.replace(/&amp;/g, '&');
            galleryImages.push(imageUrl);
          }
        }
      }
      
      console.log(`[Reddit][INFO] Post é galeria com ${galleryImages.length} imagens`);
    } 
    // Verifica se é vídeo
    else if (post.is_video) {
      type = 'hosted:video';
      
      if (post.media && post.media.reddit_video && post.media.reddit_video.fallback_url) {
        videoUrl = post.media.reddit_video.fallback_url;
      }
      
      console.log(`[Reddit][INFO] Post é vídeo hospedado`);
    }
    // Usa post_hint para determinar tipo
    else if (post.post_hint) {
      type = post.post_hint;
      
      // Se for imagem, tenta extrair URL
      if (type === 'image') {
        // Tenta obter da preview com melhor qualidade
        if (post.preview && post.preview.images && post.preview.images[0]) {
          let previewUrl = post.preview.images[0].source.url;
          // Decodifica entidades HTML
          imageUrl = previewUrl.replace(/&amp;/g, '&');
        }
        
        // Fallback para URL do post se for imagem
        if (!imageUrl && post.url && /\.(jpg|jpeg|png|gif|webp)$/i.test(post.url)) {
          imageUrl = post.url;
        }
        
        // Último recurso: thumbnail (apenas se começar com http)
        if (!imageUrl && post.thumbnail && post.thumbnail.startsWith('http')) {
          imageUrl = post.thumbnail;
        }
      }
      
      console.log(`[Reddit][INFO] Post identificado como '${type}' via post_hint`);
    }
    // Se não for nenhum dos acima, mas tem URL, pode ser um link
    else if (post.url && !post.url.includes('reddit.com')) {
      type = 'link';
      console.log(`[Reddit][INFO] Post identificado como link externo`);
    }
    // Senão, é um post de texto
    else {
      type = 'self';
      console.log(`[Reddit][INFO] Post identificado como texto`);
    }
    
    /* --- Retorna objeto consolidado --- */
    return {
      title,
      text,
      imageUrl,
      videoUrl,
      galleryImages,
      type,
      url: postUrl,
      author,
      subreddit,
      isNSFW,
      createdUtc,
      score,
      numComments
    };
    
  } catch (error) {
    console.error(`[Reddit][ERROR] Falha ao processar post do Reddit: ${error.message}`);
    throw new Error(`Falha ao processar post do Reddit: ${error.message}`);
  }
}