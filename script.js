/*
 * Este script verifica feeds RSS 
 * e posta no Discord via webhooks.
 *
 * A lista de cada feed, webhook correspondente, etc
 * fica no arquivo config.json
 */

/* BIBLIOTECAS */
const Parser = require('rss-parser');
const fs = require("fs");

/* VARIÁVEIS GLOBAIS */
let parser = new Parser();

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


// Verifica cada feed do config...
config.forEach(element => {	
	parser.parseURL(element.rss_url, function(err, feed) {
		// Para cada entrada existente no feed...
		feed.items.forEach(function(entry)
		{
			var item_timestamp = new Date(entry.pubDate).getTime();
			// Se a sobra da data/hora do item menos a data/hora da última verificação é maior que zero (mais recente)
			if (item_timestamp - last_timestamp > 0)
			{
				console.log(entry.title + ' : ' + entry.link + " - " + item_timestamp); // ADICIONAR LÓGICA DO WEBHOOK AQUI
			}
		});
	});
});

// Registra a timestamp desta execução para poder checar na próxima execução
fs.writeFileSync("./last_timestamp", new Date().getTime().toString());
