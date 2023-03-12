/*
 *  Nome:					feedchecker
 *  Descrição:				Lê uma lista JSON com URLs de feeds e posta os items de cada um em webhooks
 *  Autor:					Vico
 *  Versão:					1.0
 *  Dependências:			rss-to-json, discord-webhook-nodejs, node-cron, dayjs
*/

/* ---------------- DECLARAÇÕES ---------------- */


/* ----------------- VARIÁVEIS ----------------- */
// Config
const config = require(__dirname + "/config.json");
// Lista de Feeds
const feeds = require(__dirname + "/feeds.json");

/* ------------------ FUNÇÕES ------------------ */
function verificar_feeds()
{
	feeds.forEach((feed) => {
		console.log(feed.url, feed.feed_type, feed.webhook_url);
	});
}

/* ----------------- CALLBACKS ----------------- */

/* -------------- FLUXO PRINCIPAL -------------- */