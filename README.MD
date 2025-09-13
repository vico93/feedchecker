# 📰 Feed Checker

Script simples em Python que monitora uma lista de feeds RSS e envia os itens novos para canais do Discord via Webhook.  
Suporta envio para canais de texto **e** criação de tópicos em canais de fórum.

---

## 📦 Instalação

### 1. Clonar o repositório
```bash
git clone https://github.com/vico93/feedchecker.git
cd feedchecker
````

### 2. Criar ambiente virtual (opcional, mas recomendado)

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Instalar dependências

```bash
pip install requests feedparser
```

---

## ⚙️ Configuração

Crie um arquivo `feeds.json` na raiz do projeto (o arquivo real é ignorado pelo git).
Use o exemplo abaixo como referência:

```jsonc
[
  {
    "rss_url": "https://example.org/feed.xml",
    "webhook_url": "https://discord.com/api/webhooks/123/abc",
    "webhook_title": "Meu Bot",
    "webhook_pfpurl": "https://example.com/avatar.png",
    "is_forum_channel": true
  }
]
```

> 💡 **Dicas:**
>
> * Cada objeto da lista representa um feed.
> * Use `"is_forum_channel": true` para canais de fórum — o script criará um tópico para cada item novo.
> * O título e avatar do webhook são opcionais, mas deixam os posts mais organizados.

---

## ▶️ Uso manual

Para testar rapidamente:

```bash
python3 main.py
```

Ele vai:

* Ler os feeds configurados
* Postar os itens novos nos webhooks
* Repetir a cada 5 minutos

---

## 🛠️ Rodando como serviço (`systemd`)

Para rodar automaticamente no boot do Raspberry Pi ou servidor Linux:

Crie o arquivo `/etc/systemd/system/feedchecker.service`:

```ini
[Unit]
Description=Feed Checker - Envia RSS para Discord
After=network.target

[Service]
Type=simple
WorkingDirectory=/caminho/para/feedchecker
ExecStart=/caminho/para/feedchecker/venv/bin/python3 main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

### Ativar e iniciar o serviço:

```bash
sudo systemctl daemon-reload
sudo systemctl enable feedchecker
sudo systemctl start feedchecker
```

### Checar logs em tempo real:

```bash
journalctl -u feedchecker -f
```

---

## 📄 Licença

Este projeto é distribuído sob a licença [MIT](LICENSE).

