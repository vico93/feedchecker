/*
 * Este script verifica feeds RSS 
 * e posta no Discord via webhooks.
 *
 * A lista de cada feed, webhook correspondente, etc
 * fica no arquivo config.json
 */

/* BIBLIOTECAS */
let Parser = require('rss-parser');

/* VARIÁVEIS GLOBAIS */
let parser = new Parser();

// Lê o arquivo de config
const config = require("./config.json");

// Verifica cada feed do config...
config.forEach(element => {	
	parser.parseURL(element.rss_url, function(err, feed) {
		// Nome do feed atual
		console.log(element.name);
		console.log(feed.title);
		// Para cada entrada existente no feed...
		feed.items.forEach(function(entry) {
			if ()
			{
			}
			console.log(entry.title + ' : ' + entry.link);
		});
	});
});
