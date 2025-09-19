/*
** caminho: src/storage.js
** últimaMod: 2025-09-18 21:41
** autor: Vico
** colaboração: Gemini 2.5 Pro
*/

import Database from 'better-sqlite3';

/* --- INICIALIZAÇÃO E SETUP DO BANCO --- */

// Inicializa a conexão com o arquivo do banco de dados.
// O arquivo 'bridge.db' será criado na raiz do projeto se não existir.
const db = new Database('bridge.db');

// Garante que a tabela 'sources' exista no banco de dados.
// Este comando é executado uma vez na inicialização do módulo.
db.exec(`
  CREATE TABLE IF NOT EXISTS sources (
    source_url TEXT PRIMARY KEY,
    last_item_id TEXT,
    last_checked_at TEXT NOT NULL
  )
`);

/* --- PREPARAÇÃO DAS QUERIES (STATEMENTS) --- */

// Prepara as queries uma vez para otimizar a performance.
const selectStmt = db.prepare('SELECT last_item_id FROM sources WHERE source_url = ?');
const upsertStmt = db.prepare(`
    INSERT INTO sources (source_url, last_item_id, last_checked_at)
    VALUES (@sourceUrl, @itemId, @now)
    ON CONFLICT(source_url) DO UPDATE SET
      last_item_id = excluded.last_item_id,
      last_checked_at = excluded.last_checked_at;
`);

/* --- FUNÇÕES EXPORTADAS --- */

/**
 * Busca o ID do último item processado para uma determinada URL de fonte.
 * @param {string} sourceUrl - A URL da fonte (ex: o feed RSS).
 * @returns {string | null} O ID do último item, ou null se a fonte nunca foi processada.
 */
export function getLastItem(sourceUrl) {
  const result = selectStmt.get(sourceUrl);
  return result ? result.last_item_id : null;
}

/**
 * Atualiza (ou insere) o registro de uma fonte com o ID do último item processado.
 * @param {string} sourceUrl - A URL da fonte.
 * @param {string} itemId - O ID do item que acabou de ser processado.
 */
export function setLastItem(sourceUrl, itemId) {
  const now = new Date().toISOString();
  upsertStmt.run({ sourceUrl, itemId, now });
  console.log(`[Storage][INFO] Fonte atualizada no banco: ${sourceUrl}`);
}