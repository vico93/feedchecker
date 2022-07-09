/* */

/* BIBLIOTECAS */
const fs = require("fs");
const path = require('path');
const CRON = require('node-cron');
const RSS = require('rss-parser');

/* VARIÁVEIS GLOBAIS */
const config = require(__dirname + "/config.json");							// CONFIG
const last_timestamp_file = path.join(__dirname, '/last_timestamp');		// Arquivo que armazenará a timestamp (data/hora) da última verificação de feeds

/* FUNÇÕES */
function carregar_ultimo_timestamp()
{
	// Lê e converte para o formato adequado a timestamp da última execução (ou a recém criada caso seja a primeira execução)
	let timestamp = new Date(parseInt(fs.readFileSync(last_timestamp_file).toString())).getTime();
	return timestamp;
}

function salvar_timestamp_atual()
{
	// Substitui o valor no arquivo last_timestamp para o timestamp (data/hora) do momento atual
	fs.writeFileSync(last_timestamp_file, new Date().getTime().toString());
}

function enviar_webhook(webhook_url, username, avatar_url, feed_type, item_title, item_url)
{
	
}

// Verificar feed (RSS)
function verificar_rss(rss_url)
{
	// Declarações para o feed
	let rss_parser = new RSS();
	let rss_feed = rss_parser.parseURL(rss_url);
	
	// ...para cada item do feed RSS...
	rss_feed.items.forEach(item => {
		console.log(item.title + ':' + item.link)	// TODO
	});
}

/* FLUXO PRINCIPAL */
CRON.schedule(config.frequencia_cron, () => {
	// Carrega a data/hora (timestamp) da última verificação
	let last_timestamp = carregar_ultimo_timestamp();
	
	// SUBSTITUIR PELO LOOP DE FEEDS
	console.log('running a task every fifteen seconds');
	
	// Salva a data/hora da verificação atual
	salvar_timestamp_atual();
});