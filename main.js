/*
 *  Nome:					feedchecker
 *  Descrição:				Verifica feeds RSS e posta no Discord
 *  Autor:					Vico
 *  Versão:					1.0
 *  Dependências:			discord.js
*/

/* ---------------- DECLARAÇÕES ---------------- */
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const { Client, GatewayIntentBits } = require('discord.js');
const RSS = require('rss-parser');
const cron = require('node-cron');

/* ----------------- VARIÁVEIS ----------------- */
// Config
const config = require('./config.json');
// Objeto do Cliente do Discord.JS
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
// Objeto verificador de feeds
const rss = new RSS();
// Frequência de verificação padrão
let cron_frequency = "*/30 * * * *";
// Arquivo que armazenará a timestamp (data/hora) da última verificação de feeds
const last_timestamp_file = path.join(__dirname, '/last_timestamp');

/* ------------------ FUNÇÕES ------------------ */
// Salva/substituti o arquivo de data/hora com a hora atual
function set_last_timestamp(timestamp)
{
	// Substitui o valor no arquivo last_timestamp para o timestamp (data/hora) do momento da última verificação
	fs.writeFileSync(last_timestamp_file, timestamp.toString());
}

// Carrega a data/hora da última verificação de feeds
function get_last_timestamp()
{
	// Variável temporária que armazenará a data/hora dentro da função
	let timestamp;
	// Caso arquivo de persistência de data/hora NÃO exista...
	if (!fs.existsSync(last_timestamp_file))
	{
		// Variável armazenará a data/hora da execução atual MENOS 10 minutos.
		timestamp = moment().subtract(10, 'minutes').unix();
		// Chama salvar_timestamp_atual para salvar a variável acima no arquivo de persistência
		set_last_timestamp(timestamp);
		// Informa no console
		console.log("[INFO] Arquivo de data/hora de última execução foi criado! Esta é a primeira execução do BOT?");
	}
	else
	{
		// Lê e converte para o formato adequado a timestamp da última execução (ou a recém criada caso seja a primeira execução)
		timestamp = parseInt(fs.readFileSync(last_timestamp_file).toString());
	}
	
	// De qualquer forma, a variável timestamp terá o dado e retornamos para a função
	return timestamp;
	
}
// Posta o item dos feeds no canal no Discord especificado na config
function post_on_discord(feed_item, channel_name, create_thread)
{
	// "Pesca" o canal à partir do nome e do tipo (ambos vindos do config)
	let channel = client.channels.cache.find(ch => ch.name === channel_name);
	
	// Se o canal foi localizado...
	if (channel)
	{
		// Se é um canal de fórum
		if (channel.type === 15)
		{
			// Cria a postagem
			channel.threads.create({
				name: feed_item.title,
				autoArchiveDuration: 10080,
				message: {
					content: ':link: ' + feed_item.link,
				},
			})
			.catch(console.error);
		}
		// Se for outro canal (Texto?) -- TODO
		else
		{
			// Envia direto para o canal
			channel.send(':link: ' + feed_item.link)
			.catch(console.error);
		}
	}
}

// Verifica a lista de feeds presente no config
function check_feeds()
{
	// Busca o valor da data/hora da última verificação
	let last_timestamp = get_last_timestamp();
	
	// Loop pelo objeto de feeds indicado no config
	config.feeds.forEach(feed => {
		// Lê o feed atual do loop
		rss.parseURL(feed.url, function(err, current_feed) {
			// Loop pelos items do feed atual
			current_feed.items.forEach(item => {				
				// Converte o campo de data do item para o formato de timestamp UNIX para comparação...
				let item_datetime = moment(item.isoDate).unix();
				// Verifica se o item foi postado APÓS a última verificação...
				if (item_datetime <= last_timestamp)
				{
					// É mais recente, proceder!
					post_on_discord(item, feed.channel, feed.create_thread);
				}
			});
		});
	});
	// Atualiza a variável de data/hora da última verificação
	last_timestamp = moment().unix();
	// Grava o valor da data/hora da verificação recém feita
	set_last_timestamp(last_timestamp);
}

/* ----------------- CALLBACKS ----------------- */
// Ao iniciar o BOT
client.on('ready', () => {
	console.log(`Conectado como ${client.user.tag}!`);
});

/* -------------- FLUXO PRINCIPAL -------------- */
// Loga no Discord
client.login(config.discord.bot_token);

// Verifica se a frequência CRON passada na config é válida. Se for, passa à variável cron_frequency (caso contrário fica o valor inicial dela)
if (cron.validate(config.cron.frequency))
{
	cron_frequency = config.cron.frequency;
}

// Roda a verificação na periodicidade definida acima
cron.schedule(config.cron.frequency, () => {
    check_feeds();
});