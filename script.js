/*
 * Este script verifica feeds RSS 
 * e posta no Discord via webhooks.
 *
 * A lista de cada feed, webhook correspondente, etc
 * fica no arquivo config.json
 */

/* BIBLIOTECAS */
const fs = require("fs");
const Parser = require('rss-parser');
const { Webhook } = require('discord-webhook-node');

/* VARIÁVEIS GLOBAIS */
let parser = new Parser();

/* FUNÇÕES */
// Essa função monta e envia a mensagem para o Discord via webhook (é invocada no loop principal)
function envia_mensagem(webhook_url, username, avatar_url, item_title, item_url)
{
	let hook = new Webhook(webhook_url);
	
	hook.setUsername(username);
	hook.setAvatar(avatar_url);

	hook.send(":new:▸ **" + item_title + "**\n:link:▸ " + item_url);
	
	console.log("[INFO] Novo item publicado com sucesso!");
}

// Lê o arquivo de config
const config = require("./config.json");

// Verifica se o arquivo last_timestamp não existe (primeira execução?)...
if (!fs.existsSync("./last_timestamp"))
{
	// Cria o arquivo com o timestamp atual, pra poder realizar as checagens abaixo
	console.log("[INFO] Arquivo last_timestamp não foi encontrado. Criando e registrando a data atual...");
	fs.writeFileSync("./last_timestamp", new Date().getTime().toString());
}

// Lê a timestamp da última execução (ou a recém criada caso seja a primeira execução)
let last_timestamp = new Date(parseInt(fs.readFileSync("./last_timestamp").toString())).getTime();
// console.log(last_timestamp); DEBUG

/* LOOP PRINCIPAL*/
// Verifica cada feed no config...
config.forEach(feed => {	
	parser.parseURL(feed.rss_url, function(err, rss)
	{
		// Para cada entrada existente no feed RSS...
		rss.items.forEach(function(entry)
		{
			// Converte a data de publicação de cada item para o formato de timestamp para comparar com a última iteração do script
			var item_timestamp = new Date(entry.pubDate).getTime();
			// Se a sobra da data da publicação menos a data/hora da última verificação é maior que zero (é mais recente que a última iteração)
			if (item_timestamp - last_timestamp > 0)
			{
				// Invoca a função para enviar a publicação como webhook
				setTimeout(function()
				{
					envia_mensagem(feed.webhook_url, feed.name, feed.avatar, entry.title, entry.link);
				}, 2000);
			}
		});
	});
});

// Registra a timestamp desta execução para poder checar na próxima execução
fs.writeFileSync("./last_timestamp", new Date().getTime().toString());
