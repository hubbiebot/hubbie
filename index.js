const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { OpenAI } = require("openai"); 
const express = require('express');
const session = require('express-session');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const os = require('os'); 

// --- TRAVA DE SEGURANÇA DA API ---
if (!process.env.OPENAI_API_KEY) {
    console.error("❌ ERRO FATAL: Chave da OpenAI não encontrada!");
    process.exit(1);
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- BANCOS DE DADOS LOCAIS (Arquivos JSON) ---
let estoqueM4T = [];
let tagsContatos = {};
let configApp = {};
let contatosFixados = [];
let coresTags = {};
let conversasArquivadas = [];

const caminhoEstoque = path.join(__dirname, 'estoque.json');
const caminhoTags = path.join(__dirname, 'tags.json');
const caminhoConfig = path.join(__dirname, 'config.json');
const caminhoFixados = path.join(__dirname, 'fixados.json');
const caminhoCores = path.join(__dirname, 'cores.json');
const caminhoArquivadas = path.join(__dirname, 'arquivadas.json');

function carregarArquivos() {
    if (fs.existsSync(caminhoEstoque)) estoqueM4T = JSON.parse(fs.readFileSync(caminhoEstoque, 'utf8'));
    else fs.writeFileSync(caminhoEstoque, JSON.stringify([], null, 2));

    if (fs.existsSync(caminhoTags)) tagsContatos = JSON.parse(fs.readFileSync(caminhoTags, 'utf8'));
    else fs.writeFileSync(caminhoTags, JSON.stringify({}, null, 2));

    if (fs.existsSync(caminhoFixados)) contatosFixados = JSON.parse(fs.readFileSync(caminhoFixados, 'utf8'));
    else fs.writeFileSync(caminhoFixados, JSON.stringify([], null, 2));

    if (fs.existsSync(caminhoCores)) coresTags = JSON.parse(fs.readFileSync(caminhoCores, 'utf8'));
    else fs.writeFileSync(caminhoCores, JSON.stringify({}, null, 2));

    if (fs.existsSync(caminhoArquivadas)) conversasArquivadas = JSON.parse(fs.readFileSync(caminhoArquivadas, 'utf8'));
    else fs.writeFileSync(caminhoArquivadas, JSON.stringify([], null, 2));

    if (fs.existsSync(caminhoConfig)) configApp = JSON.parse(fs.readFileSync(caminhoConfig, 'utf8'));
    else {
        configApp.sistemaPrompt = `PIX: 3799806-0444 (Aliny Carvalho Silva).\nHorário: 07h às 17h (fechado 12h às 13h). Sábado e Domingo Fechados.\nEndereço: Rua Érico Veríssimo, 1435 - São José, Divinópolis - MG.\nEspecialidade: Roçadeiras, Geradores, Compactadores, Motores Estacionários, Betoneiras, Cortadores de Grama, Martelos, Marteletes, Placas Vibratórias, Cortadoras de piso.\nEntregas: Apenas Divinópolis, Capitólio, Arcos, Lagoa da Prata, Nova Serrana e Itauna.\nHistória: 14 anos de experiência em máquinas para construção civil.\nNão fazemos: Manutenção em carros, motos, motosserras ou compressores.\nResponda de forma curta, educada e direta.`;
        fs.writeFileSync(caminhoConfig, JSON.stringify(configApp, null, 2));
    }
}

function salvarEstoque() { fs.writeFileSync(caminhoEstoque, JSON.stringify(estoqueM4T, null, 2)); io.emit('atualizar-estoque-tabela', estoqueM4T); }
function salvarTags() { fs.writeFileSync(caminhoTags, JSON.stringify(tagsContatos, null, 2)); io.emit('atualizar-tags-geral', tagsContatos); }
function salvarConfig() { fs.writeFileSync(caminhoConfig, JSON.stringify(configApp, null, 2)); }
function salvarFixados() { fs.writeFileSync(caminhoFixados, JSON.stringify(contatosFixados, null, 2)); io.emit('atualizar-fixados', contatosFixados); }
function salvarCores() { fs.writeFileSync(caminhoCores, JSON.stringify(coresTags, null, 2)); io.emit('atualizar-cores-tags', coresTags); }
function salvarArquivadas() { fs.writeFileSync(caminhoArquivadas, JSON.stringify(conversasArquivadas, null, 2)); io.emit('atualizar-arquivadas', conversasArquivadas); }

carregarArquivos();

// --- ESTADO DO SISTEMA ---
let botLigadoGlobal = true;
let qrCodeAtual = null;
let whatsappStatus = { estado: 'iniciando', detalhe: 'Iniciando WhatsApp...' };
const contatosPausadosNoPainel = new Set();
const listaNegraPermanente = new Set(); 
const historicoConversas = {};
let lembretesAgendados = [];
let tentativasReconexao = 0;
const MAX_TENTATIVAS = 10;
const MAX_TENTATIVAS_LOGIN = 5;
const TEMPO_BLOQUEIO_LOGIN_MS = 30 * 60 * 1000;
const TIPOS_AUDIO_WHATSAPP = new Set(['ptt', 'audio', 'voice']);

function precisaAtendente(texto) {
    if (!texto || typeof texto !== 'string') return false;
    return /atendente|humano|equipe|respons[aá]vel|vendedor|suporte/i.test(texto);
}

function mensagemEhAudio(msg) {
    if (!msg?.hasMedia) return false;
    if (TIPOS_AUDIO_WHATSAPP.has(msg.type)) return true;
    return /^audio\//i.test(msg._data?.mimetype || msg.mimetype || '');
}

function formatarDataValidade(dataValidade) {
    if (!dataValidade) return 'Sem validade';
    const data = new Date(`${dataValidade}T00:00:00`);
    if (Number.isNaN(data.getTime())) return 'Sem validade';
    return data.toLocaleDateString('pt-BR');
}

function produtoVencido(produto) {
    if (!produto || produto.semValidade || !produto.validade) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const validade = new Date(`${produto.validade}T00:00:00`);
    return !Number.isNaN(validade.getTime()) && validade < hoje;
}

function produtoVenceHoje(produto) {
    if (!produto || produto.semValidade || !produto.validade) return false;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const validade = new Date(`${produto.validade}T00:00:00`);
    return !Number.isNaN(validade.getTime()) && validade.getTime() === hoje.getTime();
}

function emitirStatusWhatsapp(estado, detalhe) {
    whatsappStatus = { estado, detalhe };
    io.emit('whatsapp-status', whatsappStatus);
    console.log(`[WhatsApp] ${estado}: ${detalhe}`);
}

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({ secret: 'hubbie-v3-secret', resave: false, saveUninitialized: true }));

const verificarLogin = (req, res, next) => { if (req.session.logado) next(); else res.redirect('/login'); };

app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.post('/auth', (req, res) => {
    const agora = Date.now();
    if (req.session.loginBloqueadoAte && req.session.loginBloqueadoAte > agora) {
        const minutos = Math.ceil((req.session.loginBloqueadoAte - agora) / 60000);
        return res.send(`<script>alert("Login bloqueado. Tente novamente em ${minutos} minuto(s)."); window.location.href="/login";</script>`);
    }

    const usuario = (req.body.usuario || '').toLowerCase();
    const senha = req.body.senha || '';

    if (usuario === 'adm01' && senha === 'SENHAADM09') {
        req.session.logado = true;
        req.session.tentativasLogin = 0;
        req.session.loginBloqueadoAte = null;
        return res.redirect('/');
    }

    req.session.tentativasLogin = (req.session.tentativasLogin || 0) + 1;
    if (req.session.tentativasLogin >= MAX_TENTATIVAS_LOGIN) {
        req.session.loginBloqueadoAte = agora + TEMPO_BLOQUEIO_LOGIN_MS;
        return res.send('<script>alert("Acesso bloqueado por 30 minutos após 5 tentativas incorretas."); window.location.href="/login";</script>');
    }

    const restantes = MAX_TENTATIVAS_LOGIN - req.session.tentativasLogin;
    res.send(`<script>alert("Acesso negado. Tentativas restantes: ${restantes}."); window.location.href="/login";</script>`);
});
app.get('/', verificarLogin, (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/logout', (req, res) => { req.session.destroy(); res.redirect('/login'); });
app.use(express.static(path.join(__dirname, 'public')));

// LOOP LEMBRETES E RAM
setInterval(async () => {
    const agora = new Date(); let atualizou = false;
    for (let i = lembretesAgendados.length - 1; i >= 0; i--) {
        if (new Date(lembretesAgendados[i].dataHora) <= agora) {
            try {
                if (client.info) await client.sendMessage(lembretesAgendados[i].numero.replace(/\D/g, '') + '@c.us', lembretesAgendados[i].mensagem);
            } catch(e) {}
            lembretesAgendados.splice(i, 1); atualizou = true;
        }
    }
    if (atualizou) io.emit('atualizar-lembretes', lembretesAgendados);
}, 60000);

setInterval(() => {
    const agora = Date.now();
    for (const id in historicoConversas) { if (agora - historicoConversas[id].ultimaInteracao > 7200000) delete historicoConversas[id]; }
}, 3600000);

// --- SOCKET.IO ---
io.on('connection', (socket) => {
    socket.emit('config-atual', { ligado: botLigadoGlobal });
    socket.emit('whatsapp-status', whatsappStatus);
    socket.emit('atualizar-lista-negra', Array.from(listaNegraPermanente));
    socket.emit('atualizar-pausados', Array.from(contatosPausadosNoPainel));
    socket.emit('atualizar-lembretes', lembretesAgendados); 
    socket.emit('atualizar-estoque-tabela', estoqueM4T); 
    socket.emit('atualizar-tags-geral', tagsContatos);
    socket.emit('atualizar-fixados', contatosFixados);
    socket.emit('atualizar-cores-tags', coresTags);
    socket.emit('atualizar-arquivadas', conversasArquivadas);
    socket.emit('carregar-config-prompt', configApp.sistemaPrompt);
    if (qrCodeAtual) socket.emit('qr', qrCodeAtual);

    socket.on('toggle-global', (v) => { botLigadoGlobal = v; io.emit('config-atual', { ligado: botLigadoGlobal }); });
    socket.on('add-lista-negra', (num) => { const limpo = num.replace(/\D/g, ''); if (limpo.length >= 8) { listaNegraPermanente.add(limpo); io.emit('atualizar-lista-negra', Array.from(listaNegraPermanente)); }});
    socket.on('remove-lista-negra', (num) => { listaNegraPermanente.delete(num); io.emit('atualizar-lista-negra', Array.from(listaNegraPermanente)); });
    socket.on('toggle-contato-ia', (id) => { if(contatosPausadosNoPainel.has(id)) contatosPausadosNoPainel.delete(id); else contatosPausadosNoPainel.add(id); io.emit('atualizar-pausados', Array.from(contatosPausadosNoPainel)); });
    
    // Fixar Chats
    socket.on('fixar-chat', (id) => { if(!contatosFixados.includes(id)) { contatosFixados.push(id); salvarFixados(); } });
    socket.on('desfixar-chat', (id) => { contatosFixados = contatosFixados.filter(i => i !== id); salvarFixados(); });

    // Arquivar Conversa (move para arquivados)
    socket.on('arquivar-conversa', (id) => {
        if (!conversasArquivadas.includes(id)) {
            conversasArquivadas.push(id);
            salvarArquivadas();
        }
    });

    // Fechar Conversa (apenas fecha o chat sem arquivar)
    socket.on('fechar-conversa', (id) => {
        // Não faz nada com os dados, apenas notifica o front-end
        socket.emit('conversa-fechada', id);
    });

    // Reabrir Conversa (remove dos arquivados)
    socket.on('reabrir-conversa', (id) => {
        conversasArquivadas = conversasArquivadas.filter(i => i !== id);
        salvarArquivadas();
    });

    // Adicionar Contato
    socket.on('adicionar-contato', async (numero) => {
        if (!client.info) return;
        let numLimpo = numero.replace(/\D/g, '');
        if (!numLimpo.startsWith('55')) numLimpo = '55' + numLimpo;
        const chatId = numLimpo + '@c.us';
        try {
            await client.sendMessage(chatId, '👋 Olá! Conectado via painel administrativo do Hubbie BOT.');
            socket.emit('contato-adicionado', { id: chatId, nome: numLimpo });
        } catch(e) { console.error("Erro ao adicionar contato:", e); }
    });

    // Config do Prompt
    socket.on('salvar-config-prompt', (promptTxt) => { configApp.sistemaPrompt = promptTxt; salvarConfig(); });

    // Tags com Cores
    socket.on('adicionar-tag-cor', (data) => {
        if (!tagsContatos[data.id]) tagsContatos[data.id] = [];
        if (!tagsContatos[data.id].includes(data.tag)) { 
            tagsContatos[data.id].push(data.tag); 
            salvarTags(); 
        }
        if (!coresTags[data.id]) coresTags[data.id] = {};
        coresTags[data.id][data.tag] = data.cor;
        salvarCores();
    });
    
    socket.on('remover-tag', (data) => {
        if (tagsContatos[data.id]) { 
            tagsContatos[data.id] = tagsContatos[data.id].filter(t => t !== data.tag); 
            salvarTags(); 
        }
        if (coresTags[data.id]) { 
            delete coresTags[data.id][data.tag]; 
            if (Object.keys(coresTags[data.id]).length === 0) delete coresTags[data.id]; 
            salvarCores(); 
        }
    });

    // Estoque
    socket.on('salvar-produto', (produto) => { 
        produto.cod = (produto.cod || '').trim().toUpperCase();
        produto.nome = (produto.nome || '').trim();
        produto.semValidade = !!produto.semValidade;
        produto.validade = produto.semValidade ? '' : (produto.validade || '');
        const idx = estoqueM4T.findIndex(p => p.cod === produto.cod); 
        if(idx !== -1) estoqueM4T[idx] = produto; 
        else estoqueM4T.push(produto); 
        salvarEstoque(); 
    });
    socket.on('excluir-produto', (cod) => { estoqueM4T = estoqueM4T.filter(p => p.cod !== cod); salvarEstoque(); });

    socket.on('agendar-lembrete', (data) => { data.id = Date.now().toString(); lembretesAgendados.push(data); io.emit('atualizar-lembretes', lembretesAgendados); });
    socket.on('cancelar-lembrete', (id) => { lembretesAgendados = lembretesAgendados.filter(l => l.id !== id); io.emit('atualizar-lembretes', lembretesAgendados); });

    socket.on('iniciar-conversa-manual', async (id) => {
        if (!client.info) return;
        try { 
            const contact = await client.getContactById(id); 
            socket.emit('contato-info', { id: id, name: contact.name || contact.pushname || id.replace('@c.us', '') }); 
        } catch(e) {}
    });

    socket.on('enviar-mensagem-manual', async (data) => {
        if (!client.info) return; 
        try {
            if (data.mediaData && data.mediaType) {
                const media = new MessageMedia(data.mediaType, data.mediaData, data.mediaFilename || 'arquivo');
                await client.sendMessage(data.id, media, { caption: data.mensagem || '' });
            } else {
                await client.sendMessage(data.id, data.mensagem);
            }
            
            io.emit('nova-msg', { from: 'Você', id: data.id, body: data.mensagem || '[Arquivo enviado]', isIA: false, isHuman: true });
            if (!historicoConversas[data.id]) historicoConversas[data.id] = { ultimaInteracao: Date.now(), mensagens: [] };
            historicoConversas[data.id].ultimaInteracao = Date.now();
            historicoConversas[data.id].mensagens.push({ role: "assistant", content: data.mensagem || '[Arquivo enviado]' });
        } catch(e) { console.error("Erro ao enviar mensagem:", e); }
    });

    socket.on('enviar-disparo', async (data) => {
        if (!client.info) return;
        const lista = data.numeros.split(/[\n,]+/).map(n => n.trim().replace(/\D/g, '')).filter(n => n);
        for (let i = 0; i < lista.length; i++) {
            let chatId = (lista[i].startsWith('55') ? lista[i] : '55' + lista[i]) + '@c.us';
            try { 
                await client.sendMessage(chatId, data.mensagem); 
                if (i < lista.length - 1) await new Promise(r => setTimeout(r, Math.floor(Math.random() * (6000 - 3000 + 1)) + 3000)); 
            } catch(e) {}
        }
    });
});

// --- WHATSAPP ---
const client = new Client({ authStrategy: new LocalAuth(), puppeteer: { args: ['--no-sandbox', '--disable-setuid-sandbox'] } });
client.on('qr', qr => {
    qrCodeAtual = qr;
    io.emit('qr', qr);
    emitirStatusWhatsapp('qr', 'Aguardando leitura do QR Code.');
    qrcode.generate(qr, { small: true });
});
client.on('loading_screen', (percent, message) => emitirStatusWhatsapp('carregando', `${percent}% - ${message}`));
client.on('authenticated', () => emitirStatusWhatsapp('autenticado', 'WhatsApp autenticado. Carregando conversas...'));
client.on('auth_failure', msg => emitirStatusWhatsapp('erro', `Falha de autenticacao: ${msg}`));
client.on('change_state', state => emitirStatusWhatsapp('estado', `Estado do WhatsApp: ${state}`));
client.on('ready', () => { qrCodeAtual = null; tentativasReconexao = 0; io.emit('ready'); console.log('✅ Bot V.00.11 (Com Arquivar/Fechar) Online!'); });

client.on('ready', () => emitirStatusWhatsapp('pronto', 'WhatsApp pronto para receber mensagens.'));

client.on('message', async (msg) => {
    try {
        if (msg.isStatus || msg.from.includes('broadcast')) return;

        const contatoId = msg.from;
        const numerosRemetente = contatoId.replace(/\D/g, '');

        if (Array.from(listaNegraPermanente).some(num => numerosRemetente.endsWith(num.slice(-8))) || msg.isGroupMsg) return;

        let chat = null;
        let contact = null;
        let nomeContato = numerosRemetente;
        try {
            chat = await msg.getChat();
        } catch (e) {
            console.error(`[WhatsApp] Nao consegui carregar o chat ${contatoId}, seguindo mesmo assim:`, e.message || e);
        }
        try {
            contact = await msg.getContact();
        } catch (e) {
            console.error(`[WhatsApp] Nao consegui carregar o contato ${contatoId}, seguindo mesmo assim:`, e.message || e);
        }
        nomeContato = contact?.name || contact?.pushname || chat?.name || numerosRemetente; 
        
        let bodyFinal = msg.body;
        let conteudoParaIA = msg.body || "Vazio"; 

        // --- COMANDO: #ESTOQUE (PESQUISA RÁPIDA PARA VENDEDOR) ---
        if (msg.body && msg.body.toUpperCase().startsWith('#ESTOQUE')) {
            const busca = msg.body.substring(8).trim().toLowerCase();
            const peca = estoqueM4T.find(p => p.nome.toLowerCase().includes(busca) || p.cod.toLowerCase() === busca);
            
            if (peca) {
                let avisoValidade = '';
                if (produtoVencido(peca)) avisoValidade = `\n\n🚨 *VALIDADE VENCIDA:* ${formatarDataValidade(peca.validade)}`;
                else if (produtoVenceHoje(peca)) avisoValidade = `\n\n⚠️ *VENCE HOJE:* ${formatarDataValidade(peca.validade)}`;
                else avisoValidade = `\n\n📅 *Validade:* ${formatarDataValidade(peca.validade)}`;
                return msg.reply(`📦 *CONSULTA DE ESTOQUE*\n\n▫️ *Código:* ${peca.cod}\n▫️ *Produto:* ${peca.nome.toUpperCase()}\n▫️ *Preço:* R$ ${peca.preco}\n\n📊 *Estoque Atual:* ${peca.quantidade} un.\n⚠️ *Mínimo Ideal:* ${peca.minimo} un.${avisoValidade}`);
            } else {
                return msg.reply(`❌ Peça não encontrada no sistema. Verifique o código ou nome.`);
            }
        }

        // --- COMANDO: /LIST ESTOQUE ---
        if (msg.body && msg.body.toLowerCase().startsWith('/list estoque')) {
            const abaixo = estoqueM4T.filter(p => p.quantidade <= p.minimo);
            if(abaixo.length === 0) return msg.reply("✅ Tudo em paz! O estoque está dentro da margem de segurança.");
            let texto = "⚠️ *PEDIDO DE COMPRA (ESTOQUE BAIXO)* ⚠️\n\n";
            abaixo.forEach(p => {
                const validade = produtoVencido(p) ? ` | VENCIDO: ${formatarDataValidade(p.validade)}` : '';
                texto += `▫️ *${p.cod}* - ${p.nome.toUpperCase()}\n   Qtd: ${p.quantidade} | Mín: ${p.minimo}${validade}\n\n`;
            });
            return msg.reply(texto);
        }

        // --- COMANDO: /LOGMENSAGEM NUMERO ---
        if (msg.body && msg.body.toLowerCase().startsWith('/logmensagem')) {
            const param = msg.body.split(' ')[1];
            if(!param) return msg.reply("❌ Digite o número. Ex: /logmensagem 37999999999");
            let numLimpo = param.replace(/\D/g, '');
            let chatAlvo = (numLimpo.startsWith('55') ? numLimpo : '55' + numLimpo) + '@c.us';
            
            if(!historicoConversas[chatAlvo] || historicoConversas[chatAlvo].mensagens.length === 0) {
                return msg.reply(`❌ Nenhum histórico recente na memória para o número: ${numLimpo}`);
            }
            let texto = `📄 *LOG DE CONVERSA (${numLimpo})*\n_Últimas mensagens na memória RAM_\n\n`;
            historicoConversas[chatAlvo].mensagens.forEach(m => {
                let quem = m.role === 'assistant' ? "BOT/PAINEL" : "CLIENTE";
                let conteudo = Array.isArray(m.content) ? (m.content[0]?.text || '[Imagem]') : m.content;
                texto += `*${quem}:* ${conteudo}\n\n`;
            });
            return msg.reply(texto);
        }

        // --- COMANDO: /VENDA (SAÍDA DE ESTOQUE) ---
        if (msg.body && msg.body.toLowerCase().startsWith('/venda')) {
            const partes = msg.body.split(' ');
            if (partes.length >= 3) {
                const cod = partes[1].toUpperCase();
                const qtd = parseInt(partes[2].replace(/\D/g, '')); 
                if(isNaN(qtd)) return msg.reply("❌ Quantidade inválida.");
                const idx = estoqueM4T.findIndex(p => p.cod === cod);
                if (idx !== -1) {
                    estoqueM4T[idx].quantidade -= qtd; salvarEstoque();
                    let resposta = `✅ *Baixa concluída!*\n📦 -${qtd}x ${estoqueM4T[idx].nome.toUpperCase()}\n📉 Atual: ${estoqueM4T[idx].quantidade} un.`;
                    if (estoqueM4T[idx].quantidade <= estoqueM4T[idx].minimo) {
                        resposta += `\n\n⚠️ *ALERTA!* Abaixo do Mínimo (${estoqueM4T[idx].minimo} un). Fazer pedido!`;
                    }
                    return msg.reply(resposta);
                } else return msg.reply(`❌ O código "${cod}" não existe no sistema.`);
            } else return msg.reply("❌ Formato: /venda COD QUANTIDADE");
        }

        // --- COMANDO: /ADDESTOQUE (ENTRADA DE ESTOQUE) ---
        if (msg.body && msg.body.toLowerCase().startsWith('/addestoque')) {
            const partes = msg.body.split(' ');
            if (partes.length >= 3) {
                const cod = partes[1].toUpperCase();
                const qtd = parseInt(partes[2].replace(/\D/g, '')); 
                if(isNaN(qtd)) return msg.reply("❌ Quantidade inválida.");
                
                const idx = estoqueM4T.findIndex(p => p.cod === cod);
                if (idx !== -1) {
                    estoqueM4T[idx].quantidade += qtd; 
                    salvarEstoque(); 
                    let resposta = `✅ *Entrada registrada com sucesso!*\n📦 +${qtd}x ${estoqueM4T[idx].nome.toUpperCase()}\n📈 Estoque atual: ${estoqueM4T[idx].quantidade} un.`;
                    return msg.reply(resposta);
                } else return msg.reply(`❌ Erro: O código "${cod}" não foi encontrado no estoque.`);
            } else return msg.reply("❌ Formato incorreto.\nUse: /addestoque CODIGO QUANTIDADE\nExemplo: /addestoque M4T001 5");
        }

        // --- RECONHECIMENTO DE ÁUDIO ---
        if (mensagemEhAudio(msg)) {
            const media = await msg.downloadMedia();
            if (media) {
                let ext = media.mimetype ? (media.mimetype.split(';')[0].split('/')[1] || 'ogg') : 'ogg';
                if (ext === 'mpeg') ext = 'mp3'; 
                const tempFilePath = path.join(os.tmpdir(), `audio_${Date.now()}.${ext}`);
                try {
                    fs.writeFileSync(tempFilePath, media.data, { encoding: 'base64' });
                    const transcription = await openai.audio.transcriptions.create({ file: fs.createReadStream(tempFilePath), model: "whisper-1", language: "pt" });
                    bodyFinal = transcription.text || "[Áudio inaudível]";
                    conteudoParaIA = `O cliente enviou um áudio. Transcrição: ${bodyFinal}`;
                    bodyFinal = `🎤 Áudio transcrito: "${bodyFinal}"`; 
                } catch(e) {
                    bodyFinal = "[Erro ao entender o áudio.]";
                    conteudoParaIA = "O cliente enviou um áudio, mas não foi possível transcrever. Responda pedindo para repetir ou aguardar um atendente.";
                } 
                finally { try { if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath); } catch(err) {} }
            }
        }

        // --- 👁️ RECONHECIMENTO DE IMAGEM ---
        if (msg.hasMedia && msg.type === 'image') {
            const media = await msg.downloadMedia();
            if (media) {
                const mime = media.mimetype || 'image/jpeg';
                const legenda = msg.body ? msg.body : "Analise esta imagem que enviei.";
                conteudoParaIA = [
                    { type: "text", text: legenda },
                    { type: "image_url", image_url: { url: `data:${mime};base64,${media.data}` } }
                ];
                const legendaPainel = msg.body ? `<br><strong>Legenda:</strong> ${msg.body}` : '';
                bodyFinal = `<img src="data:${mime};base64,${media.data}" style="max-width: 100%; max-height: 250px; border-radius: 8px; margin-bottom: 5px;">${legendaPainel}`;
            }
        }

        io.emit('nova-msg', { from: nomeContato, id: contatoId, body: bodyFinal, isIA: false });

        // Se a conversa estava arquivada, reabrir automaticamente
        if (conversasArquivadas.includes(contatoId)) {
            conversasArquivadas = conversasArquivadas.filter(i => i !== contatoId);
            salvarArquivadas();
        }

        // --- FLUXO DA IA ---
        if (botLigadoGlobal && !contatosPausadosNoPainel.has(contatoId) && !msg.fromMe) {
            if (chat) {
                try {
                    await chat.sendStateTyping();
                } catch (e) {
                    console.error(`[WhatsApp] Nao consegui enviar status digitando para ${contatoId}:`, e.message || e);
                }
            }
            if (!historicoConversas[contatoId]) historicoConversas[contatoId] = { ultimaInteracao: Date.now(), mensagens: [] };
            historicoConversas[contatoId].ultimaInteracao = Date.now();
            
            historicoConversas[contatoId].mensagens.push({ role: "user", content: conteudoParaIA });

            const completion = await openai.chat.completions.create({
                model: "gpt-5.5",
                messages: [{ role: "system", content: configApp.sistemaPrompt }, ...historicoConversas[contatoId].mensagens],
            });

            const respostaIA = completion.choices[0].message.content;
            historicoConversas[contatoId].mensagens.push({ role: "assistant", content: respostaIA });
            if (historicoConversas[contatoId].mensagens.length > 10) historicoConversas[contatoId].mensagens.shift();

            await msg.reply(respostaIA);
            io.emit('nova-msg', { from: 'Assistente', id: contatoId, body: respostaIA, isIA: true, precisaAtendente: precisaAtendente(respostaIA) });
        }
    } catch (e) {
        console.error('[Erro ao processar mensagem]', e);
        emitirStatusWhatsapp('erro', 'Erro ao processar uma mensagem. Veja o terminal.');
    }
});

process.on('uncaughtException', (err) => console.error('⚠️ Erro:', err));
process.on('unhandledRejection', (reason) => console.error('⚠️ Promessa:', reason));
client.on('disconnected', () => { if (tentativasReconexao < MAX_TENTATIVAS) { tentativasReconexao++; setTimeout(() => client.initialize(), 5000); } });

server.listen(7000, () => console.log('🌐 Servidor na porta 7000'));
client.initialize();
