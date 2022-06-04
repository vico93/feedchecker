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

/* for (let i = 0; i < config.length; i++) {
	console.log(config[i].name);
} */

// Verifica cada feed do config...
config.forEach(element => {
	
	parser.parseURL(element.rss_url, function(err, feed) {
	  console.log(feed);

	  feed.items.forEach(function(entry) {
		console.log(entry.title + ':' + entry.link);
	  });
	});

});

// console.log(config.length); // DEBUG