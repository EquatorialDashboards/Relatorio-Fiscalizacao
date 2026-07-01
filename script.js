let dados = [];
let dadosFiltrados = [];
let charts = {};
let visaoAtual = "distribuidora";
let metricaAtual = "penalidade";
let modoGraficoTema = "tema";
let visaoNCAtiva = false;
let filtroGrafico = {
    campo: null,
    valores: []
};
let frameAtualizacao = null;
let tabelaOculta = false;

function normArtigo(s) {
    return String(s || "")
        .normalize("NFKD")             
        .replace(/[\u00A0]/g, " ")        
        .replace(/\s+/g, " ")              
        .trim()
        .toUpperCase();                  
}
const MAPA_ARTIGO_DETALHE = (function() {
    const raw = {

        "Art. 13.  Inciso VI": "VI - praticar tarifas de uso ou conexão na transmissão ou na distribuição em valores superiores aos estabelecidos;",
        "Art. 13 Inciso VI": "VI - praticar tarifas de uso ou conexão na transmissão ou na distribuição em valores superiores aos estabelecidos;",
        "Art. 13. Inciso VII": "VII - deixar de assegurar livre acesso aos sistemas de transmissão ou distribuição de energia elétrica, ou de efetuar o atendimento a acessantes nos prazos e nas condições estabelecidas;",
        "Art. 13. Inciso II": "II - provocar, dar causa ou permitir a propagação de distúrbio que ocasione o desligamento de consumidores;",
        "Art. 13.  Inciso XI": "XI - praticar conduta que atente contra a concorrência efetiva ou a ordem econômica;",

        "Art. 12. Inciso I, Alínea \"a\"": "I - descumprir às disposições legais, regulamentares e contratuais relativas: a) aos níveis de qualidade dos serviços de energia elétrica;",
        "Art. 12.  Inciso II": "II - deixar de realizar as obras essenciais à prestação de serviço adequado;",
        "Art. 12.  Inciso III": "III - deixar de atender pedido de serviços nos prazos e nas condições estabelecidas na legislação ou no contrato;",
        "Art. 12. Inciso IV": "IV - descumprir aos prazos estabelecidos nos atos de delegação de concessões, permissões ou autorizações para implantar instalações de energia elétrica;",
        "Art. 12. Inciso V": "V - implantar, operar ou manter instalações de energia elétrica e os respectivos equipamentos de forma inadequada, em face dos requisitos legais, regulamentares ou contratuais aplicáveis;",
        "Art. 12.  Inciso VI": "VI - deixar de realizar a contabilização em conformidade com as normas, procedimentos ou instruções legais ou regulamentares;",
        "Art. 12.  Inciso VII": "VII - deixar de encaminhar, para exame e aprovação da ANEEL, nas hipóteses e condições contratuais, legais ou regulamentares;",
        "Art. 12.  Inciso XI": "XI - criar óbice ou dificuldade ao acesso às instalações necessárias à atividade de fiscalização;",
        "Art. 12.  Inciso XII": "XII - deixar de atender ao mercado consumidor, de forma abrangente, nos termos da legislação ou da concessão;",
        "Art. 12.  Inciso XIII": "XIII - impor ônus para o solicitante ou consumidor na prestação do serviço público em desacordo com as disposições legais ou regulamentares;",
        "Art. 12.  Inciso XXI": "XXI - descumprir disposições legais, regulamentares, contratuais ou constantes do ato de concessão, permissão ou autorização relativas à gestão dos recursos econômico-financeiros;",

        "Art. 11.  Inciso I": "I - deixar de instituir ou de prover condições para o adequado funcionamento da Ouvidoria ou do Conselho de Consumidores;",
        "Art. 11.  Inciso V": "V - deixar de enviar ou disponibilizar à ANEEL, nos prazos e nas condições estabelecidas na legislação, documentos ou informações econômicas e financeiras;",
        "Art. 11.  inciso V": "V - deixar de enviar ou disponibilizar à ANEEL, nos prazos e nas condições estabelecidas na legislação, documentos ou informações econômicas e financeiras;",
        "Art. 11.  Inciso VII": "VII - deixar de cumprir ao disposto nos Procedimentos de Distribuição;",
        "Art. 11.  Inciso VIII": "VIII - deixar de cumprir ao disposto nos Procedimentos de Rede;",
        "Art. 11.  Inciso X": "X - deixar de cumprir ao disposto nas Condições Gerais de Fornecimento de Energia Elétrica e nas Regras de Prestação do Serviço Público de Distribuição de Energia Elétrica;",
        "Art. 11.  Inciso XI": "XI - deixar de cumprir ao disposto na Convenção, nas Regras, nos Procedimentos de Comercialização ou na Convenção Arbitral celebrada entre os agentes e a CCEE;",
        "Art. 11. inciso XIII": "XIII - deixar de cumprir ao disposto nos contratos de permissão ou concessão;",
        "Art. 11.  inciso XXI": "XXI - deixar de cumprir determinação da Diretoria Colegiada da ANEEL, no prazo estabelecido;",

        "Art. 10 Inciso I": "I - deixar de manter registro atualizado das reclamações e solicitações dos consumidores;",
        "Art. 10. Inciso XVIII": "XVIII - realizar leitura ou faturamento em desacordo com a legislação;",
        "Art. 10. Inciso XX": "XX - deixar de enviar ou disponibilizar à ANEEL informações ou documentos, nos prazos e nas condições estabelecidas na legislação.",

        "Art. 9.  Inciso III": "III - deixar de prestar informações aos consumidores ou usuários, quando solicitado ou conforme determinado nas disposições legais, regulamentares ou contratuais;",

        "Art. 5. Inciso IX": "IX - intervenção para adequação do serviço público de energia elétrica;",
        "Art. 5.  Inciso V": "V - obrigação de fazer;"
    };

    const out = {};
    for (const [k, v] of Object.entries(raw)) {
        out[normArtigo(k)] = v;
    }

    return out;
})();

function getNcsFiltradas(item) {
    if (filtroGrafico.campo === "ncs" && filtroGrafico.valores.length > 0) {
        const sel = filtroGrafico.valores.map(normArtigo);
        return (item.ncs || []).filter(nc => sel.includes(normArtigo(nc)));
    }
    return item.ncs || [];
}

// =========================
// AUXILIARES
// ========================
const btnVisao = document.getElementById("btnVisao");
const btnVisaoNC = document.getElementById("btnVisaoNC");

function atualizarBotoesVisao() {

    btnVisao.classList.remove("active");
    btnVisaoNC.classList.remove("active");

    if (visaoNCAtiva) {
        btnVisaoNC.classList.add("active");
    } else {
        btnVisao.classList.add("active");
    }
}

Chart.defaults.animation = false;
function handleChartClick(id, valor) {

    let campo = null;

    if (
    id === "graficoDistribuidora" ||
    id === "graficoGrupo" ||
    id === "graficoNCEmpilhado"
) {
    campo = visaoAtual === "grupo"
        ? "grupo"
        : "distribuidora";
}

else if (id === "graficoNCBarra") {
    campo = "ncs";
}
    else if (id === "graficoEstado") {
    const valorLimpo = String(valor).trim();

    if (filtroGrafico.campo !== "estado") {
        filtroGrafico = { campo: "estado", valores: [valorLimpo] };
    } else {
        const index = filtroGrafico.valores.indexOf(valorLimpo);

        if (index >= 0) {
            filtroGrafico.valores.splice(index, 1);
        } else {
            filtroGrafico.valores.push(valorLimpo);
        }

        if (filtroGrafico.valores.length === 0) {
            filtroGrafico = { campo: null, valores: [] };
        }
    }

    aplicarFiltros();
    return;
}
    else if (id === "graficoRazaoUC") {
        campo = visaoAtual === "grupo" ? "grupo" : "distribuidora";
    }

    if (!campo) return;

    if (filtroGrafico.campo !== campo) {
        filtroGrafico = { campo, valores: [valor] };
    } else {
        const index = filtroGrafico.valores.indexOf(valor);

        if (index >= 0) {
            filtroGrafico.valores.splice(index, 1);
        } else {
            filtroGrafico.valores.push(valor);
        }

        if (filtroGrafico.valores.length === 0) {
            filtroGrafico = { campo: null, valores: [] };
        }
    }

    aplicarFiltros();
}

function parseValorMonetario(valor) {
    if (valor === null || valor === undefined || valor === "") {
        return 0;
    }

    let texto = valor.toString().trim();

    // caso venha no padrão brasileiro
    if (texto.includes(",") && texto.includes(".")) {
        texto = texto.replace(/\./g, "").replace(",", ".");
    }

    // caso venha só com vírgula decimal
    else if (texto.includes(",")) {
        texto = texto.replace(",", ".");
    }

    return Number(texto) || 0;
}

function formatarMoeda(valor) {
    return Number(valor).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function getChartTitle(titulo) {
    return {
        display: true,
        text: titulo,
        align: "start",
        color: "#1e293b",
        font: {
            size: 16,
            weight: "600"
        }
    };
}
function getValorMetrica(item) {

    let valor = null;

    if (metricaAtual === "penalidade") {
        valor = item.penalidade;
    }

    else if (metricaAtual === "multa") {
        valor = item.multa;
    }

    else if (metricaAtual === "diretoria") {
        valor = item.multaDiretoria;
    }

    return (valor === null || valor === undefined) ? 0 : (Number(valor) || 0);
}
function isRegistroValido(item) {

    // precisa ter auto
    if (!item.auto || item.auto.trim() === "") {
        return false;
    }

    // VISÃO NC:
    // só considera registros com NC
    if (
        visaoNCAtiva &&
        (!item.ncs || item.ncs.length === 0)
    ) {
        return false;
    }

    // Penalidade
    if (metricaAtual === "penalidade") {
        return true;
    }

    // Multa
    if (metricaAtual === "multa") {
        return item.multa !== null &&
               item.multa > 0;
    }

    // Diretoria
    return item.multaDiretoria !== null &&
           item.multaDiretoria > 0;
}
// =========================
// CARREGAR CSV
// =========================
function carregarDados() {
    const agora = Math.floor(Date.now() / (1000 * 60 * 10));
    Papa.parse(`./base_dashboard.csv?v=${agora}`, {
        download: true,
        header: true,
        skipEmptyLines: true,
complete: function (resultado) {

    if (!resultado.data || resultado.data.length === 0) {
        console.error("❌ CSV não carregou ou está vazio");
        return;
    }

    console.log("TOTAL LINHAS:", resultado.data.length);
    console.log("COLUNAS CSV:", Object.keys(resultado.data[0]));
           dados = resultado.data.map(item => {

    // =========================
    // CAPTURA TODAS AS NCs
    // =========================
    const ncs = [];

    ["NC_1", "NC_2", "NC_3", "NC_4", "NC_5"]
    .forEach(coluna => {

        const valor = item[coluna];

        if (!valor || !valor.toString().trim()) return;

        // remove prefixos NC1 -, NC2 -, etc
        const ncLimpa = normArtigo(
    valor
        .toString()
        .trim()

        // NC1 -, NC2 –, NC3 —
        .replace(/^NC\s*\d+\s*[-–—]\s*/i, "")

        // NC1 - SFF -
        .replace(/^NC\s*\d+\s*[-–—]\s*SFF\s*[-–—]\s*/i, "")

        // SFF – Agentes –
        .replace(/^SFF\s*[–—-]\s*AGENTES?\s*[–—-]\s*/i, "")

        // SFF-CMREF -
        .replace(/^SFF\s*-\s*CMREF\s*[-–—]\s*/i, "")

        // SFF -
        .replace(/^SFF\s*[-–—]\s*/i, "")



        .trim()
);

        if (ncLimpa) {
            ncs.push(ncLimpa);
        }
    });

    return {

        distribuidora:
            item["Sigla_Distribuidora"]?.trim() || "Sem Sigla",
        grupo:
            item["Grupo_Distribuidora"]?.trim() || "Sem Grupo",
        estado:
            (item["Estado"] || "")
            .toString()
            .trim()
            .toUpperCase(),
        flag:
            item["Flag_Distribuidora"]?.trim() || "",
        tema:
            item["Resumo temas"]?.trim() || "Sem Tema",
        ano:
            Number(item["AnoLavratura"]) || null,
        mercado:
            parseValorMonetario(item["VlrMercado"]),

        penalidade:
            (item["VlrPenalidade"] === undefined ||
             item["VlrPenalidade"] === null ||
             item["VlrPenalidade"].toString().trim() === "")
                ? null
                : parseValorMonetario(item["VlrPenalidade"]),

        multa: (() => {
            const v =
                item["VlrMultaAposJuizo"] ??
                item["VlrMultaAposJuizo "] ??
                item["VlrMultaApósJuízo"] ??
                item["VlrMultaPosJuizo"] ??
                null;

            return (
                v === null ||
                v === undefined ||
                v.toString().trim() === ""
            )
                ? null
                : parseValorMonetario(v);
        })(),

        multaDiretoria: (() => {
            const v =
                item["VlrMultaAposDiretoria"] ??
                item["VlrMultaAposDiretoria "] ??
                null;

            return (
                v === null ||
                v === undefined ||
                v.toString().trim() === ""
            )
                ? null
                : parseValorMonetario(v);
        })(),

        tipoPenalidade:
            item["DscTipoPenalidade"]?.trim() || "Sem Tipo",

auto: item["NumAutoInfracao"]?.trim() || "",

ncs: ncs

    };
});

            // manter apenas distribuidoras
            dados = dados.filter(x => {
                const flag = x.flag.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                return flag.includes("distribuidora") && !flag.includes("nao");
            });
            const btn = document.getElementById("btnVisao");
            if (btn) {
            btn.addEventListener("click", alternarVisao);
            }

            preencherFiltros();
            iniciarMultiselect();
            inicializarSliderAno();
            aplicarFiltros();
            atualizarBotoesVisao();
            atualizarBotaoVisao();
        },
        error: function (erro) {
            console.error("Erro ao carregar CSV:", erro);
        }
        
    });
}

// =========================
// FILTROS
// =========================
function preencherFiltros() {

    preencherSelect(
        "filtroDistribuidora",
        [...new Set(dados.map(x => x.distribuidora))]
    );

    preencherSelect(
        "filtroGrupo",
        [...new Set(dados.map(x => x.grupo))]
    );

    preencherSelect(
        "filtroPenalidade",
        [...new Set(dados.map(x => x.tipoPenalidade))]
    );

    preencherSelect(
        "filtroEstado",
        [...new Set(dados.map(x => x.estado))]
    );

    preencherSelect(
        "filtroTema",
        [...new Set(dados.map(x => x.tema))]
    );

    preencherSelect(
        "filtroNC",
        [...new Set(
            dados.flatMap(x => x.ncs || []).map(normArtigo)
        )]
    );

    [
        "filtroDistribuidora",
        "filtroGrupo",
        "filtroPenalidade",
        "filtroEstado",
        "filtroTema",
        "filtroNC",
        "sliderAnoInicio",
        "sliderAnoFim"
    ].forEach(id => {

        const el = document.getElementById(id);

        if (el) {
            el.addEventListener("change", aplicarFiltros);
        }
    });
}

function preencherSelect(id, lista) {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = ``;

    lista
        .filter(Boolean)
        .sort()
        .forEach(valor => {
            select.innerHTML += `
                <option value="${valor}">${valor}</option>
            `;
        });
}

function getBaseComNC(lista) {

    return lista.filter(item =>
        item.ncs &&
        item.ncs.length > 0
    );
}// =========================
// FIX MOBILE: vigia que reconstrói gráficos com altura 0
// O timing do bug de altura no Android é imprevisível (depende de quando
// o navegador resolve a barra de rolagem/flex internamente), então em vez
// de confiar em um cálculo único, verificamos de fato se cada canvas
// renderizou com altura > 0 e, se não, reconstruímos aquele gráfico
// específico. Tenta algumas vezes com atraso crescente.
// =========================
// =========================
// DEBUG TEMPORÁRIO MOBILE — remover depois de diagnosticar
// Mostra na tela a altura real de cada container/canvas para
// pararmos de adivinhar e vermos o número exato.
// =========================
function debugAlturasMobile() {
    if (window.innerWidth > 768) return;

    const alvos = [
        "graficoRazaoUC",
        "graficoDistribuidora",
        "graficoGrupo",
        "graficoTema",
        "graficoEstado",
        "graficoNCEmpilhado",
        "graficoNCBarra"
    ];

    let painel = document.getElementById("painelDebugAltura");
    if (!painel) {
        painel = document.createElement("div");
        painel.id = "painelDebugAltura";
        painel.style.cssText =
            "position:fixed;bottom:0;left:0;right:0;z-index:99999;" +
            "background:rgba(0,0,0,0.85);color:#0f0;font:11px monospace;" +
            "padding:8px;max-height:40vh;overflow:auto;white-space:pre-line;";
        document.body.appendChild(painel);
    }

    let texto = "DEBUG ALTURAS (px)\n";

    alvos.forEach(id => {
        const canvas = document.getElementById(id);
        if (!canvas) {
            texto += id + ": não existe no DOM\n";
            return;
        }
        const container = canvas.closest(".grafico-container");
        let linha = id + ": canvas=" + canvas.offsetHeight;
        if (container) {
            linha += " container=" + container.offsetHeight;
        }
        let el = canvas.parentElement;
        const partes = [];
        while (el && el !== container) {
            partes.push(el.className + "=" + el.offsetHeight);
            el = el.parentElement;
        }
        if (partes.length) linha += " | " + partes.reverse().join(" > ");
        texto += linha + "\n";
    });

    painel.textContent = texto;
}

window.addEventListener("load", () => {
    setTimeout(debugAlturasMobile, 1500);
    setTimeout(debugAlturasMobile, 3000);
});
window.addEventListener("touchstart", () => setTimeout(debugAlturasMobile, 300), { passive: true });

function verificarEReconstruirGraficosMobile(tentativa) {
    if (window.innerWidth > 768) return;

    tentativa = tentativa || 1;

    const verificacoes = [
        { id: "graficoDistribuidora", fn: atualizarGraficos },
        { id: "graficoEstado", fn: atualizarGraficoEstado },
        { id: "graficoRazaoUC", fn: atualizarGraficoRazaoUC },
        { id: "graficoTema", fn: atualizarGraficoTema }
    ];

    if (visaoNCAtiva) {
        verificacoes.push({ id: "graficoNCEmpilhado", fn: atualizarGraficosNC });
    }

    let precisaRetentar = false;
    const jaReconstruido = new Set();

    verificacoes.forEach(({ id, fn }) => {
        const canvas = document.getElementById(id);
        if (!canvas) return;

        const alturaOk = canvas.offsetHeight > 10;

        if (!alturaOk) {
            precisaRetentar = true;

            if (fn && !jaReconstruido.has(fn)) {
                jaReconstruido.add(fn);
                try { fn(); } catch (e) {}
            }
        }
    });

    if (precisaRetentar && tentativa < 6) {
        setTimeout(() => {
            verificarEReconstruirGraficosMobile(tentativa + 1);
        }, 350 * tentativa);
    }
}

// Reconstrói também ao primeiro toque/scroll no mobile, já que isso
// historicamente força o navegador a recalcular o layout corretamente
// (é o que faz o gráfico Tema "aparecer" ao clicar em Alternar).
if (window.innerWidth <= 768) {
    const aoPrimeiraInteracao = () => {
        setTimeout(() => verificarEReconstruirGraficosMobile(), 50);
    };
    window.addEventListener("touchstart", aoPrimeiraInteracao, { once: true, passive: true });
    window.addEventListener("scroll", aoPrimeiraInteracao, { once: true, passive: true });
}

function aplicarFiltros() {

    // evita múltiplas execuções no mesmo frame
    if (frameAtualizacao) {
        cancelAnimationFrame(frameAtualizacao);
    }

    frameAtualizacao = requestAnimationFrame(() => {

        function getValoresSelecionados(selectId) {

            const select = document.getElementById(selectId);

            if (!select) return [];

            const valores = Array.from(select.selectedOptions)
                .map(opt => opt.value);

            if (valores.includes("")) return [];

            return valores;
        }

        const distribuidoras =
            getValoresSelecionados("filtroDistribuidora");

        const grupos =
            getValoresSelecionados("filtroGrupo");

        const tipos =
            getValoresSelecionados("filtroPenalidade");

            const estados =
            getValoresSelecionados("filtroEstado");

        const temas =
            getValoresSelecionados("filtroTema");

        const ncsSelecionadas =
            getValoresSelecionados("filtroNC");

        const anoInicio =
            Number(
                document.getElementById("sliderAnoInicio")?.value
            ) || null;

        const anoFim =
            document.getElementById("sliderAnoFim")?.value;

        const anoFimNum =
            anoFim ? Number(anoFim) : null;

        atualizarLabelsAno();

        let baseFiltro = [...dados];
        if (!visaoNCAtiva) {

    const secaoNC =
        document.getElementById("secaoNC");

    if (secaoNC) {
        secaoNC.style.display = "none";
    }

    ["graficoNCEmpilhado", "graficoNCBarra"]
    .forEach(id => {

        if (charts[id]) {

            charts[id].destroy();

            delete charts[id];
        }
    });
}
dadosFiltrados = baseFiltro
    .map(item => {
        let ncsFiltradas = item.ncs || [];

        if (ncsSelecionadas.length > 0) {
            const sel = ncsSelecionadas.map(normArtigo);

            ncsFiltradas = ncsFiltradas.filter(nc =>
                sel.includes(normArtigo(nc))
            );
        }

        return {
            ...item,
            ncs: ncsFiltradas
        };
    })
    .filter(item => {
``

    return (
        (distribuidoras.length === 0 ||
            distribuidoras.includes(item.distribuidora))
        &&
        (grupos.length === 0 ||
            grupos.includes(item.grupo))
        &&
        (tipos.length === 0 ||
            tipos.includes(item.tipoPenalidade))
        &&
        (estados.length === 0 ||
            estados.includes(item.estado))
        &&
        (temas.length === 0 ||
            temas.includes(item.tema))
        &&
        (
            ncsSelecionadas.length === 0 ||
            item.ncs.length > 0
        )
        &&
        (!anoInicio || item.ano >= anoInicio)
        &&
        (!anoFimNum || item.ano <= anoFimNum)
        &&
        (
            !filtroGrafico.campo ||
            (
                filtroGrafico.valores &&
                filtroGrafico.valores.length > 0 &&
                (
                    filtroGrafico.campo === "ncs"
                        ? getNcsFiltradas(item).length > 0
                        : filtroGrafico.valores.includes(
                            String(item[filtroGrafico.campo]).trim()
                        )
                )
            )
        )
    );
});

       // atualizações não-visuais (cards, tabela) rodam imediatamente
atualizarCards();
atualizarCardNC();
atualizarTabela();

// Todos os gráficos são criados após o duplo rAF para garantir que o
// layout flex já resolveu as dimensões antes do Chart.js inicializar.
// Sem isso, o canvas recebe height:0 no mobile (Android/Samsung).
requestAnimationFrame(() => {

    requestAnimationFrame(() => {
        atualizarGraficos();
        atualizarGraficoEstado();
        atualizarGraficoRazaoUC();
        atualizarGraficoTema();

        if (visaoNCAtiva) {
            atualizarGraficosNC();
        }

        // resize garante que charts criados com dimensão errada se corrijam
     setTimeout(() => {
            Object.keys(charts).forEach(id => {
                try {
                    if (charts[id]) {
                        charts[id].resize();
                        charts[id].update('none');
                    }
                } catch(e) {}
            });

            verificarEReconstruirGraficosMobile();

        }, 300);
    });
});
        frameAtualizacao = null;
    });
}
// =========================
// NC DISTRIBUIDORA
// =========================
function calcularNCDistribuidora(lista) {
    const mapa = {};

    lista.forEach(item => {
        const chave = item.distribuidora;
        const valor = Number(item.mercado);

       if (!chave || isNaN(valor)) return;

        if (!(chave in mapa)) {
            mapa[chave] = valor;
        }
    });

    return Object.values(mapa).reduce((a, b) => a + b, 0);
}
// =========================
// CARDS
// =========================
function atualizarCards() {

    const usarMulta = metricaAtual === "multa";

    const autosValidos = dadosFiltrados.filter(isRegistroValido);

    const totalAutos = autosValidos.length;

    const totalValor = autosValidos.reduce((soma, item) => {
    return soma + getValorMetrica(item);
}, 0);

    const nc = calcularNCDistribuidora(dadosFiltrados);

    document.getElementById("totalAutos").textContent =
        totalAutos.toLocaleString("pt-BR");

    document.getElementById("totalPenalidade").textContent =
        totalValor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL"
        });

    document.getElementById("ncDistribuidora").textContent =
        nc.toLocaleString("pt-BR");

    let tituloAtual = "Penalidade";

if (metricaAtual === "multa") {
    tituloAtual = "Multa Pós-Juízo";
}

if (metricaAtual === "diretoria") {
    tituloAtual = "Multa Pós-Diretoria";
}

document.getElementById("tituloPenalidade").textContent =
    tituloAtual;
}
// =========================
// CARD NC
// =========================
function atualizarCardNC() {
    const el = document.getElementById("totalNC");
    if (!el) return;
    const base = getBaseComNC(dadosFiltrados);
    let total = 0;
    base.forEach(item => { total += getNcsFiltradas(item).length; });
    el.textContent = total.toLocaleString("pt-BR");
}
// =========================
// FUNÇÃO AUXILIAR AGRUPAR
// =========================
function agrupar(lista, campo, usarValor = false) {
    const agrupado = {};

    lista.forEach(item => {
        const chave = item[campo] || "Sem Informação";

        if (!agrupado[chave]) {
            agrupado[chave] = 0;
        }

        if (usarValor) {
            agrupado[chave] += getValorMetrica(item);
        } else {
            agrupado[chave] += 1;
        }
    });

    return agrupado;
}
function inicializarSliderAno() {
    const anos = dados
        .map(x => x.ano)
        .filter(Boolean);

    const min = Math.min(...anos);
    const max = Math.max(...anos);

    const inicio = document.getElementById("sliderAnoInicio");
    const fim = document.getElementById("sliderAnoFim");

    inicio.min = min;
    inicio.max = max;
    inicio.value = min;

    fim.min = min;
    fim.max = max;
    fim.value = max;

    atualizarLabelsAno();

    inicio.addEventListener("input", () => {
    if (Number(inicio.value) > Number(fim.value)) {
        inicio.value = fim.value;
    }
    aplicarFiltros();
});

    fim.addEventListener("input", () => {
    if (Number(fim.value) < Number(inicio.value)) {
        fim.value = inicio.value;
    }
    aplicarFiltros();
});
}

function atualizarLabelsAno() {
    document.getElementById("anoInicioLabel").textContent =
        document.getElementById("sliderAnoInicio").value;

    document.getElementById("anoFimLabel").textContent =
        document.getElementById("sliderAnoFim").value;
}

// =========================
// CRIAR GRÁFICO
// =========================

// FIX MOBILE: alguns navegadores Android não resolvem "height: 100%"
// corretamente dentro de containers flex (mesmo com min-height definido,
// pois min-height não conta como altura "especificada" para os filhos).
// Esta função força altura em px lida do .grafico-container (que tem
// altura fixa garantida no mobile via CSS), aplicando nos wrappers
// intermediários antes de cada gráfico ser criado.
function corrigirAlturaMobile(canvas) {
    if (!canvas) return;
    if (window.innerWidth > 768) return;

    const container = canvas.closest(".grafico-container");
    if (!container) return;

    const containerH = container.clientHeight;
    if (!containerH) return;

    const header = container.querySelector(".grafico-header");
    const headerH = header ? header.offsetHeight : 0;

    const alturaDisponivel = Math.max(containerH - headerH - 24, 150);

    let el = canvas.parentElement;
    while (el && el !== container) {
        // .grafico-scroll-y é o conteúdo interno do gráfico Tema (pode
        // ser mais alto que o container para permitir scroll vertical)
        if (!el.classList.contains("grafico-scroll-y")) {
            el.style.height = alturaDisponivel + "px";
        }
        el = el.parentElement;
    }
}

function criarGrafico(id, titulo, labels, valores) {
       const combinado = labels.map((l, i) => [l, valores[i]])
        .sort((a, b) => b[1] - a[1]);

    labels = combinado.map(x => x[0]);
    valores = combinado.map(x => x[1]);

    const canvas = document.getElementById(id);
    if (!canvas) return;
    const scroll = canvas.closest(".grafico-scroll");

if (scroll) {
    const larguraPorBarra = 55;
    const larguraCalculada = labels.length * larguraPorBarra;
    const container = canvas.closest(".grafico-container");
    const larguraMinima = container ? container.clientWidth : 0;

    scroll.style.width = Math.max(larguraCalculada, larguraMinima) + "px";
}

    if (charts[id]) {
        charts[id].destroy();
        delete charts[id];
    }

    charts[id] = new Chart(canvas, {
        type: "bar",
        data: {
            labels: labels,
          datasets: [{
    label: titulo,
    data: valores,
    borderRadius: 6,
    barThickness: 18,
    maxBarThickness: 20,
    backgroundColor: corGrafico(labels),
    cursor: "pointer"
}]
        },
        plugins: [ChartDataLabels],
        options: {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 200,
onClick: (evt, elements) => {

    const chart = charts[id];
    if (!chart) return;

    const points = chart.getElementsAtEventForMode(
        evt,
        'nearest',
        { intersect: true },
        true
    );

    if (!points.length) return;

    const index = points[0].index;
    const valor = chart.data.labels[index];

    handleChartClick(id, valor);
},
   plugins: {
    title: tituloPadrao(titulo),
    legend: {
        position: "top",
        labels: {
            font: {
                size: 12,
                weight: "bold"
            }
        }
    },
        datalabels: {
        anchor: "end",
        align: "end",
        color: "#334155",
        font: {
            weight: "bold",
            size: 11
        },
        formatter: (value, context) => {

    const ranking = (context.dataIndex + 1) + "°";
    return ranking;
}
    },
   tooltip: {
    callbacks: {
        label: function(context) {

            const value = context.parsed.y;
            if (
                id === "graficoDistribuidora"
            ) {
                return " Valor: " + formatarMoeda(value);
            }
            return " Quantidade: " + value.toLocaleString("pt-BR");
        }
    }
}
},
    scales: {
    x: {
        ticks: {
    autoSkip: false,
    maxRotation: 45,
    minRotation: 30,
    padding: 18,
    callback: function(value) {
        const label = this.getLabelForValue(value);
        return label.length > 10
            ? label.substring(0, 10) + "..."
            : label;
    }
}
    }
},

  
}
    });
    requestAnimationFrame(() => {
        if (charts[id]) charts[id].resize();
    });
}

// =========================
// GRÁFICOS PRINCIPAIS
// =========================
function atualizarGraficos() {

    const campo =
        visaoAtual === "grupo"
            ? "grupo"
            : "distribuidora";

    const base = dadosFiltrados.filter(isRegistroValido);
    const grafPenalidade = Object.entries(
        agrupar(base, campo, true)
    );
    const grafAutos = Object.entries(
        agrupar(
            dadosFiltrados.filter(isRegistroValido),
            campo
        )
    );

    let tituloGrafico = "Penalidade";

    if (metricaAtual === "multa") {
        tituloGrafico = "Multa Pós-Juízo";
    }

    if (metricaAtual === "diretoria") {
        tituloGrafico = "Multa Pós-Diretoria";
    }

    criarGrafico(
        "graficoDistribuidora",
        tituloGrafico,
        grafPenalidade.map(x => x[0]),
        grafPenalidade.map(x => x[1])
    );

    criarGrafico(
        "graficoGrupo",
        "Fiscalizações",
        grafAutos.map(x => x[0]),
        grafAutos.map(x => x[1])
    );
}
// =========================
// GRÁFICO TEMA DINÂMICO
// =========================
function atualizarGraficoTema() {

    const canvas = document.getElementById("graficoTema");
    if (!canvas) return;

let baseTema = dadosFiltrados.filter(isRegistroValido);

if (visaoNCAtiva) {
    baseTema = getBaseComNC(baseTema);
}
    let labels = [];
    let datasets = [];

    // =========================
    // TEMA
    // =========================
    if (modoGraficoTema === "tema") {

        const agrupado = agrupar(baseTema, "tema");

        const ordenado = Object.entries(agrupado)
            .sort((a, b) => b[1] - a[1]);

        labels = ordenado.map(x => x[0]);

      datasets = [{
    label: "Qtd Autos",
    data: ordenado.map(x => x[1]),
    borderRadius: 6,
    backgroundColor: corGrafico(labels),
    barThickness: 18,
    maxBarThickness: 22, 
    datalabels: {
        anchor: "end",
        align: "right",
        color: "#0f172a",
        font: {
            weight: "bold",
            size: 11
        },
        
        formatter: (value) => {
            return value.toLocaleString("pt-BR");
        }
    }
}];

    }

    // =========================
    // ANO
    // =========================
    else if (modoGraficoTema === "ano") {

        const agrupado = agrupar(baseTema, "ano");

        const ordenado = Object.entries(agrupado)
            .sort((a, b) => Number(a[0]) - Number(b[0]));

        labels = ordenado.map(x => x[0]);

        datasets = [{
            label: "Qtd Autos",
            data: ordenado.map(x => x[1]),
            borderRadius: 6,
            backgroundColor: corGrafico(labels),
            barThickness: 26,
            maxBarThickness: 32
        }];
    }

    // =========================
    // TEMA x ANO
    // =========================
    else {

        const temas = [...new Set(
            baseTema.map(x => x.tema || "Sem Tema")
        )];

        const anos = [...new Set(
            baseTema.map(x => x.ano).filter(Boolean)
        )].sort((a, b) => a - b);

        labels = anos;

        const datasetsTemaAno = temas.map((tema, i) => {
            const data = anos.map(ano =>
                baseTema.filter(x =>
                    (x.tema || "Sem Tema") === tema &&
                    x.ano === ano
                ).length
            );
            return {
                label: tema,
                data,
                _max: Math.max(...data),
                stack: "temaAno",
                borderRadius: 4,
                backgroundColor: corPorTema(tema, i)
            };
        });
        // Pilha mais cheia fica na base
        datasetsTemaAno.sort((a, b) => b._max - a._max);
        datasets = datasetsTemaAno.map(({ _max, ...rest }) => rest);
    }

    // DESTROI ANTES
    if (charts["graficoTema"]) {
        charts["graficoTema"].destroy();
        delete charts["graficoTema"];
    }

    const isTema = modoGraficoTema === "tema";
    const isEmpilhado = modoGraficoTema === "temaAno";

    // =========================
    // SCROLL
    // =========================
    const scrollY = canvas.closest(".grafico-scroll-y");

    if (scrollY) {

        if (isTema) {

            scrollY.style.height =
                Math.max(400, labels.length * 34) + "px";

        } else {

            scrollY.style.height = "100%";
        }
    }

    corrigirAlturaMobile(canvas);

    charts["graficoTema"] = new Chart(canvas, {

        type: "bar",

        data: {
            labels,
            datasets
        },

        options: {

            indexAxis: isTema ? "y" : "x",

            responsive: true,

            maintainAspectRatio: false,

            animation: false,

            onClick: (evt, elements, chart) => {

                const points = chart.getElementsAtEventForMode(
                    evt,
                    "nearest",
                    { intersect: true },
                    true
                );

                if (!points.length) return;

                const index = points[0].index;

                let valor;

                if (modoGraficoTema === "tema") {
                    valor = chart.data.labels[index];
                }

                else if (modoGraficoTema === "ano") {
                    valor = chart.data.labels[index];
                }

                else {

                    const datasetIndex =
                        points[0].datasetIndex;

                    valor =
                        chart.data.datasets[datasetIndex].label;
                }

                const campo =
                    modoGraficoTema === "ano"
                        ? "ano"
                        : "tema";

                const valorString = String(valor).trim();

                if (
                    filtroGrafico.campo === campo &&
                    filtroGrafico.valores.includes(valorString)
                ) {

                    filtroGrafico = {
                        campo: null,
                        valores: []
                    };

                } else {

                    filtroGrafico = {
                        campo,
                        valores: [valorString]
                    };
                }

                aplicarFiltros();
            },

            plugins: {

                title: tituloPadrao(
                    isTema
                        ? "Fiscalizações por Tema"
                        : modoGraficoTema === "ano"
                            ? "Fiscalizações por Ano"
                            : "Tema por Ano"
                ),

legend: {
    display: !isTema && modoGraficoTema !== "temaAno",
    position: "left",
    labels: {
        generateLabels: function(chart) {
            return Chart.defaults
                .plugins
                .legend
                .labels
                .generateLabels(chart);
        }
    }
},

tooltip: {
    callbacks: {

        title: function(items) {

            if (
                modoGraficoTema === "temaAno" &&
                items.length > 0
            ) {

                const datasetIndex =
                    items[0].datasetIndex;

                const ds =
                    charts["graficoTema"]
                        .data
                        .datasets[datasetIndex];

                return ds
                    ? ds.label
                    : (items[0].label || "");
            }

            return items[0]?.label || "";
        },

        label: function(context) {

            const valor = isTema
                ? context.parsed.x
                : context.parsed.y;

            return " Qtd: " +
                Number(valor)
                    .toLocaleString("pt-BR");
        }
    }
},
    datalabels: {
    display: true,
    anchor: isTema ? "end" : "end",
    align: isTema ? "right" : "top",
    offset: 6,
    clamp: true,
    color: "#0f172a",
    font: {  
        weight: "bold",
        size: 12
    },
    formatter: (value, context) => {

        if (modoGraficoTema === "tema") {
            return value.toLocaleString("pt-BR");
        }
        return null;
    }
}
            },

            scales: isTema
                ? {
                    y: {
                        ticks: {
                            autoSkip: false,
                            color: "#334155",
                            align: "start",
                            crossAlign: "far",
                            padding: 8
                        },
                        grid: {
                            display: false
                        }
                    },

                    x: {
                        beginAtZero: true
                    }
                }

                : {

                    x: {
                        stacked: isEmpilhado,
                        ticks: {
                            autoSkip: false
                        }
                    },

                    y: {
                        stacked: isEmpilhado,
                        beginAtZero: true
                    }
                }
        }
    });

    renderLegendaTema(
        isEmpilhado ? datasets : []
    );

    requestAnimationFrame(() => {

        if (charts["graficoTema"]) {

            charts["graficoTema"].resize();

            charts["graficoTema"].update("none");
        }
    });
}

function atualizarGraficoRazaoUC() {

    const campo = visaoAtual === "grupo" ? "grupo" : "distribuidora";

    const agrupado = {};

   const base = dadosFiltrados.filter(isRegistroValido);

    base.forEach(item => {
        const chave = item[campo] || "Sem Informação";

        if (!agrupado[chave]) {
            agrupado[chave] = {
                penalidade: 0,
                mercado: 0,
                autos: 0
            };
        }

        agrupado[chave].penalidade += getValorMetrica(item);


        // pega VlrMercado apenas 1 vez por grupo/distribuidora
        if (agrupado[chave].mercado === 0) {
            agrupado[chave].mercado =
                Number(item.mercado || 0);
        }

        // contagem de autos
        agrupado[chave].autos += 1;
    });

    const dadosGrafico = Object.keys(agrupado)
        .map(label => ({
            label: label,
            razao:
                agrupado[label].mercado > 0
                    ? agrupado[label].penalidade /
                      agrupado[label].mercado
                    : 0,
            autos: agrupado[label].autos
        }))
        .sort((a, b) => b.razao - a.razao);

    const labels = dadosGrafico.map(x => x.label);
    const razaoUC = dadosGrafico.map(x => x.razao);
    const qtdAutos = dadosGrafico.map(x => x.autos);

    const canvas = document.getElementById("graficoRazaoUC");
    if (!canvas) return;

    const scroll = canvas.closest(".grafico-scroll");

if (scroll) {

    const larguraPorBarra = 55;

    const larguraCalculada =
        labels.length * larguraPorBarra;

    const container =
        canvas.closest(".grafico-container");

    const larguraMinima =
        container ? container.clientWidth : 0;

    scroll.style.width =
        Math.max(
            larguraCalculada,
            larguraMinima
        ) + "px";
}

    if (charts["graficoRazaoUC"]) {
        charts["graficoRazaoUC"].destroy();
        delete charts["graficoRazaoUC"];
    }

    corrigirAlturaMobile(canvas);

   charts["graficoRazaoUC"] = new Chart(canvas, {
    plugins: [ChartDataLabels],
    data: {
        labels: labels,
        datasets: [
            {
                type: "bar",
                label: "Razão UC",
                order: 2,
                data: razaoUC,
                yAxisID: "y",
                borderRadius: 6,
                maxBarThickness: 20,
                barThickness: 18,
                backgroundColor: corGrafico(labels)
            },
            {
                type: "line",
                label: "Qtd Autos",
                order: 1,
                data: qtdAutos,
                yAxisID: "y1",
                tension: 0.35,
                pointRadius: 4,
                borderColor: "#ef4444",
                backgroundColor: "#ef4444",
                pointBackgroundColor: "#ef4444",
                datalabels: { display: false }
            }
        ]
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,

        onClick: (evt, elements, chart) => {
            const points = chart.getElementsAtEventForMode(
                evt,
                'nearest',
                { intersect: true },
                true
            );

        const chartInstance = charts["graficoRazaoUC"];
        if (!points.length) return;
        const index = points[0].index;
        const valor = chart.data.labels[index];
        handleChartClick("graficoRazaoUC", valor);
                },

        plugins: {
            title: {
                display: true,
                text: metricaAtual === "penalidade"
            ? "Penalidade Normalizada"
            : "Multa Normalizada",
                align: "start",
                color: "#1e293b",
                font: {
                    size: 16,
                    weight: "600"
                }
            },
            legend: {
                position: "top"
            },
            datalabels: {
                anchor: "end",
                align: "end",
                color: "#334155",
                font: {
                    weight: "bold",
                    size: 11
                },
              formatter: (value, context) => {

    if (context.datasetIndex !== 0) return null;
    return (context.dataIndex + 1) + "°";
}
            },
            tooltip: {
    callbacks: {
        label: function(context) {
            if (context.datasetIndex === 0) {

                return " Valor Normalizado: R$ " +
                    context.parsed.y.toLocaleString("pt-BR", {
                        minimumFractionDigits: 4,
                        maximumFractionDigits: 6
                    });
            }
            return " Qtd Autos: " +
                context.parsed.y.toLocaleString("pt-BR");
        }
    }
}
        },

        scales: {
            y: {
                position: "left",
                beginAtZero: true,
                title: {
                    display: true,
                    text: "Razão UC"
                }
            },
            y1: {
                position: "right",
                beginAtZero: true,
                grid: {
                    drawOnChartArea: false
                },
                title: {
                    display: true,
                    text: "Qtd Autos"
                }
            }
        }
    }
});

    requestAnimationFrame(() => {
        if (charts["graficoRazaoUC"]) charts["graficoRazaoUC"].resize();
    });
}

// =========================
// LEGENDA CUSTOMIZADA TEMA
// =========================
function renderLegendaTema(datasets) {
    const container = document.getElementById("legendaTema");
    if (!container) return;

    if (!datasets || datasets.length === 0) {
        container.style.display = "none";
        container.innerHTML = "";
        return;
    }

    container.style.display = "block";
    container.innerHTML = datasets.map(ds => `
        <div class="legenda-item" title="${ds.label}">
            <span class="legenda-cor" style="background:${ds.backgroundColor};"></span>
            <span>${ds.label}</span>
        </div>
    `).join("");
}

// =========================
// ALTERNAR MODO GRÁFICO TEMA
// =========================
function alternarGraficoTema() {
    if (modoGraficoTema === "tema") {
        modoGraficoTema = "ano";
    }
    else if (modoGraficoTema === "ano") {
        modoGraficoTema = "temaAno";
    }
    else {
        modoGraficoTema = "tema";
    }

    atualizarGraficoTema();
}

function atualizarGraficoEstado() {

    const canvas = document.getElementById("graficoEstado");
    if (!canvas) return;

    // Base original
    let base = dadosFiltrados.filter(item => item.estado && isRegistroValido(item));

    if (
        filtroGrafico.campo === "estado" &&
        filtroGrafico.valores.length > 0
    ) {
        base = base.filter(item =>
            filtroGrafico.valores.includes(
                String(item.estado).trim()
            )
        );
    }

    const agrupado = agrupar(base, "estado");

    const ordenado = Object.entries(agrupado)
        .sort((a, b) => b[1] - a[1]);

    const labels = ordenado.map(x => x[0]);
    const valores = ordenado.map(x => x[1]);

    if (charts["graficoEstado"]) {
        charts["graficoEstado"].destroy();
        delete charts["graficoEstado"];
    }

    corrigirAlturaMobile(canvas);

    charts["graficoEstado"] = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Fiscalizações",
                data: valores,
                borderRadius: 6,
                backgroundColor: corGrafico(labels)
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,

            onClick: (evt, elements, chart) => {

                const points = chart.getElementsAtEventForMode(
                    evt,
                    'nearest',
                    { intersect: true },
                    true
                );

                if (!points.length) return;

                const index = points[0].index;
                const valor = chart.data.labels[index];

                handleChartClick("graficoEstado", valor);
            },

            plugins: {
                title: tituloPadrao("Fiscalizações por Estado"),
                legend: {
                    display: false
                }
            }
        }
    });

    requestAnimationFrame(() => {
        if (charts["graficoEstado"]) charts["graficoEstado"].resize();
    });
}

// =========================
// VISÃO NC
// =========================
function alternarVisaoNC() {

    visaoNCAtiva = !visaoNCAtiva;
    atualizarBotoesVisao();

    const secao = document.getElementById("secaoNC");
    const btn = document.getElementById("btnVisaoNC");

    if (!secao || !btn) return;

    if (visaoNCAtiva) {

        secao.style.display = "block";
        btn.classList.add("active");

    } else {

        secao.style.display = "none";
        btn.classList.remove("active");
    }
    aplicarFiltros();
    
}
// =========================
// NC EMPILHADO
// =========================
function atualizarGraficoNCEmpilhado() {

    const canvas =
        document.getElementById("graficoNCEmpilhado");

    if (!canvas) return;

    const campo =
        visaoAtual === "grupo"
            ? "grupo"
            : "distribuidora";

    const agrupado = {};

    const tiposNC = new Set();

    const baseNC = dadosFiltrados.filter(item =>
    getNcsFiltradas(item).length > 0
);

baseNC.forEach(item => {
        const chave =
            item[campo] || "Sem Informação";

        if (!agrupado[chave]) {
            agrupado[chave] = {};
        }

        getNcsFiltradas(item).forEach(nc => {

            tiposNC.add(nc);

            if (!agrupado[chave][nc]) {
                agrupado[chave][nc] = 0;
            }

            agrupado[chave][nc] += 1;
        });
    });

const totalNCPorLabel = {};

baseNC.forEach(item => {
    const chave =
        visaoAtual === "grupo"
            ? item.grupo
            : item.distribuidora;

    if (!totalNCPorLabel[chave]) {
        totalNCPorLabel[chave] = 0;
    }

    totalNCPorLabel[chave] += getNcsFiltradas(item).length;
});

const labelsOrdenados = Object.keys(agrupado)
    .sort((a, b) =>
        totalNCPorLabel[b] - totalNCPorLabel[a]
    );
    const labels = labelsOrdenados;

    // Ordena datasets pelo valor máximo em qualquer barra: pilha mais cheia fica na base
    const datasetsNC = [...tiposNC].map((nc, index) => {
        const data = labels.map(label => agrupado[label][nc] || 0);
        return {
            label: nc,
            data,
            _max: Math.max(...data),
            stack: "nc",
            borderRadius: 4,
            backgroundColor: corPorTema(nc, index)
        };
    });
    datasetsNC.sort((a, b) => b._max - a._max);
    const datasets = datasetsNC.map(({ _max, ...rest }) => rest);

    const wrapper =
        document.getElementById(
            "wrapperGraficoNCEmpilhado"
        );

    if (wrapper) {
        const minW = labels.length <= 4
            ? Math.max(labels.length * 140, 400)
            : Math.max(labels.length * 100, 700);
        wrapper.style.minWidth = minW + "px";
    }

    if (charts["graficoNCEmpilhado"]) {

        charts["graficoNCEmpilhado"].destroy();

        delete charts["graficoNCEmpilhado"];
    }

    corrigirAlturaMobile(canvas);

    charts["graficoNCEmpilhado"] =
        new Chart(canvas, {

            type: "bar",
            plugins: [ChartDataLabels],
            data: {
                labels,
                datasets
            },

        options: {

    responsive: true,

    maintainAspectRatio: false,

    onClick: (evt, elements, chart) => {

    const points = chart.getElementsAtEventForMode(
        evt,
        "nearest",
        { intersect: true },
        true
    );

    if (!points.length) return;

    const point = points[0];

    // DISTRIBUIDORA / GRUPO
    const index = point.index;

    // DATASET = NC
    const datasetIndex = point.datasetIndex;

    const distribuidora =
        chart.data.labels[index];

    const nc = normArtigo(chart.data.datasets[datasetIndex].label);

    // FILTRO POR NC
    if (filtroGrafico.campo !== "ncs") {

        filtroGrafico = {
            campo: "ncs",
            valores: [nc]
        };

    } else {

        const idx = filtroGrafico.valores.map(normArtigo).indexOf(nc);

        if (idx >= 0) {
            filtroGrafico.valores.splice(idx, 1);
        } else {
            filtroGrafico.valores.push(nc);
        }

        if (filtroGrafico.valores.length === 0) {
            filtroGrafico = {
                campo: null,
                valores: []
            };
        }
    }

    aplicarFiltros();
},
    plugins: {

        title: tituloPadrao(
            "Não Conformidades"
        ),

        legend: {
            display: false
        },

        tooltip: {
            callbacks: {
                label: function(context) {
                    return " " + normArtigo(context.dataset.label || "") + ": " + context.parsed.y;
                },
                afterLabel: function(context) {
                    const artigo = normArtigo(context.dataset.label || "");
                    const detalhe = MAPA_ARTIGO_DETALHE[artigo];
                    if (!detalhe) return "";
                    const palavras = detalhe.split(" ");
                    const linhas = []; let linha = "";
                    palavras.forEach(p => {
                        if ((linha + " " + p).trim().length > 60) { linhas.push(linha.trim()); linha = p; }
                        else { linha = (linha + " " + p).trim(); }
                    });
                    if (linha) linhas.push(linha);
                    return linhas;
                }
            }
        },

        datalabels: {
            anchor: "end",
            align: "top",
            offset: 2,
            color: "#0f172a",
            font: {
                weight: "bold",
                size: 11
            },
            formatter: (value, context) => {
                const datasetIndex = context.datasetIndex;
                const datasets = context.chart.data.datasets;
                const isUltimoDataset = datasetIndex === datasets.length - 1;
                if (!isUltimoDataset) return null;

                // Soma total da pilha para este label
                const total = datasets.reduce((soma, ds) => {
                    return soma + (ds.data[context.dataIndex] || 0);
                }, 0);
                return total > 0 ? total.toLocaleString("pt-BR") : null;
            }
        },
    },

    scales: {

        x: {
            stacked: true,
            ticks: {
                autoSkip: false,
                maxRotation: 45,
                minRotation: 30
            }
        },

        y: {
            stacked: true,
            beginAtZero: true
        }
    }
}
        });

    renderLegendaNC(datasets);
}
function atualizarGraficoNCBarra() {

    const canvas =
        document.getElementById("graficoNCBarra");

    if (!canvas) return;

    const agrupado = {};

    const baseNC = dadosFiltrados.filter(item =>
    getNcsFiltradas(item).length > 0);

    // AGRUPA POR NC
    baseNC.forEach(item => {

        getNcsFiltradas(item).forEach(nc => {

            const chave = nc || "Sem NC";

            if (!agrupado[chave]) {
                agrupado[chave] = 0;
            }

            agrupado[chave] += 1;
        });
    });

    const ordenado = Object.entries(agrupado)
        .sort((a, b) => b[1] - a[1]);

    const labels =
        ordenado.map(x => x[0]);

    const valores =
        ordenado.map(x => x[1]);

    const wrapper =
        document.getElementById(
            "wrapperGraficoNCBarra"
        );

    if (wrapper) {
        const minW = labels.length <= 5
            ? Math.max(labels.length * 120, 400)
            : Math.max(labels.length * 80, 900);
        wrapper.style.minWidth = minW + "px";
    }

    if (charts["graficoNCBarra"]) {

        charts["graficoNCBarra"].destroy();

        delete charts["graficoNCBarra"];
    }

    corrigirAlturaMobile(canvas);

    charts["graficoNCBarra"] =
        new Chart(canvas, {

            type: "bar",

            data: {

                labels,

                datasets: [{

                    label: "Ocorrências de NC",

                    data: valores,

                    borderRadius: 6,

                    backgroundColor:
                        corGrafico(labels),

                    barThickness: 18,

                    maxBarThickness: 22
                }]
            },

            plugins: [ChartDataLabels],

            options: {

                responsive: true,

                maintainAspectRatio: false,

                onClick: (evt, elements, chart) => {

                    const points = chart.getElementsAtEventForMode(
                        evt,
                        "nearest",
                        { intersect: true },
                        true
                    );

                    if (!points.length) return;

                    const index = points[0].index;
                    const valor = normArtigo(chart.data.labels[index]);

                    if (filtroGrafico.campo !== "ncs") {
                        filtroGrafico = { campo: "ncs", valores: [valor] };
                    } else {
                        const idx = filtroGrafico.valores.map(normArtigo).indexOf(valor);
                        if (idx >= 0) {
                            filtroGrafico.valores.splice(idx, 1);
                        } else {
                            filtroGrafico.valores.push(valor);
                        }
                        if (filtroGrafico.valores.length === 0) {
                            filtroGrafico = { campo: null, valores: [] };
                        }
                    }

                    aplicarFiltros();
                },

                plugins: {

                    title: tituloPadrao(
                        "NCs Mais Recorrentes"
                    ),

                    legend: {
                        display: false
                    },

                    datalabels: {
                        anchor: "end",
                        align: "top",
                        offset: 4,
                        color: "#0f172a",
                        font: {
                            weight: "bold",
                            size: 11
                        },
                        formatter: (value, context) => {
                            const label = normArtigo(context.chart.data.labels[context.dataIndex]);
                            const isSel = filtroGrafico.campo === "ncs" &&
                                filtroGrafico.valores.map(normArtigo).includes(label);
                            return isSel ? "Total: " + value.toLocaleString("pt-BR") : (context.dataIndex + 1) + "°";
                        }
                    },

                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return " Ocorrências: " + context.parsed.y.toLocaleString("pt-BR");
                            },
                            afterLabel: function(context) {
                                const artigo = normArtigo(context.label);
                                const detalhe = MAPA_ARTIGO_DETALHE[artigo];
                                if (!detalhe) return "";
                                const palavras = detalhe.split(" ");
                                const linhas = []; let linha = "";
                                palavras.forEach(p => {
                                    if ((linha + " " + p).trim().length > 60) { linhas.push(linha.trim()); linha = p; }
                                    else { linha = (linha + " " + p).trim(); }
                                });
                                if (linha) linhas.push(linha);
                                return linhas;
                            }
                        }
                    }
                },

                scales: {

                    x: {

                        ticks: {

                            autoSkip: false,

                            maxRotation: 45,

                            minRotation: 30,

                            callback: function(value) {

                                const label =
                                    this.getLabelForValue(value);

                                return label.length > 18
                                    ? label.substring(0, 18) + "..."
                                    : label;
                            }
                        }
                    },

                    y: {

                        beginAtZero: true,

                        title: {

                            display: true,

                            text: "Qtd Ocorrências"
                        }
                    }
                }
            }
        });
}
// =========================
// LEGENDA NC
// =========================

function renderLegendaNC(datasets) {

    const container =
        document.getElementById("legendaNC");

    if (!container) return;

    container.innerHTML =
        datasets.map(ds => `

        <div
            class="legenda-item"
            title="${ds.label}">

            <span
                class="legenda-cor"
                style="background:${ds.backgroundColor};">
            </span>

            <span>${ds.label}</span>

        </div>

    `).join("");
}
// =========================
// ATUALIZAR TODOS GRÁFICOS NC
// =========================
function atualizarGraficosNC() {

    atualizarGraficoNCEmpilhado();

    atualizarGraficoNCBarra();

    requestAnimationFrame(() => {

        if (charts["graficoNCEmpilhado"]) {
            charts["graficoNCEmpilhado"].resize();
            charts["graficoNCEmpilhado"].update("none");
        }

        if (charts["graficoNCBarra"]) {
            charts["graficoNCBarra"].resize();
            charts["graficoNCBarra"].update("none");
        }
    });
}

// =========================
// TABELA
// =========================
function atualizarTabela() {
    const tbody = document.querySelector("#tabelaDados tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    dadosFiltrados
        .filter(item => {
            // Respeita metricaAtual (multa/diretoria exigem valor > 0)
            // e visaoNCAtiva (exige que o item tenha NCs)
            if (!isRegistroValido(item)) return false;

            // Filtro adicional de clique em barra de NC
            if (filtroGrafico.campo === "ncs") {
                return getNcsFiltradas(item).length > 0;
            }
            return true;
        })
        .slice(0, 100)
        .forEach(item => {

            const ncsFiltradas = getNcsFiltradas(item);

            const ncsTexto = (ncsFiltradas.length > 0)
                ? ncsFiltradas.map(nc =>
                    `<span class="tabela-nc-tag">${nc}</span>`
                  ).join("")
                : '<span style="color:#94a3b8;font-size:11px;">—</span>';

            tbody.innerHTML += `
                <tr>
                    <td>${item.distribuidora}</td>
                    <td>${item.grupo}</td>
                    <td>${item.estado}</td>
                    <td>${item.tema}</td>
                    <td>${formatarMoeda(getValorMetrica(item))}</td>
                    <td>${item.auto}</td>
                    <td class="tabela-nc-cell">${ncsTexto}</td>
                </tr>
            `;
        });
const conteudo = document.getElementById("conteudoTabela");
const icone = document.getElementById("iconeTabela");

if (conteudo && icone) {
    conteudo.style.display = tabelaOculta ? "none" : "block";
    icone.textContent = tabelaOculta ? "▶" : "▼";
}
}
window.toggleTabela = function () {

    const conteudo = document.getElementById("conteudoTabela");
    const icone = document.getElementById("iconeTabela");

    if (!conteudo || !icone) return;

    tabelaOculta = !tabelaOculta;

    conteudo.style.display = tabelaOculta ? "none" : "block";
    icone.textContent = tabelaOculta ? "▶" : "▼";
};

function aplicarFiltroGrafico(id, valor) {

    if (id === "graficoDistribuidora") {
        document.getElementById("filtroDistribuidora").value = valor;
    }

    else if (id === "graficoGrupo") {
        document.getElementById("filtroGrupo").value = valor;
    }

    filtroGrafico = { campo: id === "graficoGrupo" ? "grupo" : "distribuidora", valor: valor };

    aplicarFiltros();
}
function tituloPadrao(texto) {
    return {
        display: true,
        text: texto,
        align: "start",
        color: "#1e293b",
        font: {
            size: 16,
            weight: "600"
        },
        padding: {
            top: 10,
            bottom: 10
        }
    };
}

function corGrafico(labels) {
    const cores = [
        "#3b82f6",
        "#60a5fa",
        "#93c5fd",
        "#2563eb",
        "#1d4ed8"
    ];

    return labels.map((label, i) =>
         filtroGrafico.valores?.includes(label)
            ? "#1e40af"
            : cores[i % cores.length]
    );
}
// =========================
// TROCAR VISÃO
// =========================

function alternarVisao() {
    visaoAtual =
        visaoAtual === "distribuidora"
            ? "grupo"
            : "distribuidora";

    atualizarBotaoVisao();
    aplicarFiltros();
}

const btnDownload = document.getElementById("btnDownload");
if (btnDownload) {
    btnDownload.addEventListener("click", () => {
        if (!dadosFiltrados.length) return;

        const csv = Papa.unparse(dadosFiltrados);

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "dados_filtrados.csv";
        a.click();

        URL.revokeObjectURL(url);
    });
}
function atualizarBotaoVisao() {

    const btn = document.getElementById("btnVisao");

    if (!btn) return;

    btn.classList.remove(
        "btn-distribuidora",
        "btn-grupo"
    );

    if (visaoAtual === "distribuidora") {

        btn.classList.add("btn-distribuidora");

        btn.innerHTML = `
            <span class="icon">🏢</span>
            Distribuidora
        `;

    } else {

        btn.classList.add("btn-grupo");

        btn.innerHTML = `
            <span class="icon">🏭</span>
            Grupo
        `;
    }
}

function atualizarBotaoNC() {

    const btn =
        document.getElementById("btnVisaoNC");

    if (!btn) return;

    btn.classList.remove(
        "btn-nc-inativo",
        "btn-nc-ativo"
    );

    if (visaoNCAtiva) {

        btn.classList.add("btn-nc-ativo");

        btn.innerHTML = `
            <span class="icon">📋</span>
            Visão NC Ativa
        `;

    } else {

        btn.classList.add("btn-nc-inativo");

        btn.innerHTML = `
            <span class="icon">📄</span>
            Visão NC
        `;
    }
}
function corPorTema(tema, index) {
    const cores = [
        "#3b82f6",
        "#3516e6",
        "#e75b8a",
        "#ef4444",
        "#8b5cf6",
        "#06b6d4",
        "#b6e8f7",
        "#671680"
    ];

    return cores[index % cores.length];
}

function limparFiltroGrafico() {
    filtroGrafico = { campo: null, valores: [] };

    // Resetar instâncias Choices.js (limpa visual e seleção interna)
    ["filtroDistribuidora", "filtroGrupo", "filtroPenalidade",
     "filtroEstado", "filtroTema", "filtroNC"].forEach(id => {
        if (choicesInstances[id]) {
            choicesInstances[id].removeActiveItems();
        }
    });

    const inicio = document.getElementById("sliderAnoInicio");
    const fim = document.getElementById("sliderAnoFim");

    if (inicio && fim) {
        inicio.value = inicio.min;
        fim.value = fim.max;
    }

    atualizarLabelsAno();
    aplicarFiltros();
}

function alternarMetrica(tipo) {

    metricaAtual = tipo;

    const col = document.getElementById("colPenalidade");

    if (col) {

        if (tipo === "penalidade") {
            col.textContent = "Penalidade";
        }

        else if (tipo === "multa") {
            col.textContent = "Multa Pós-Juízo";
        }

        else {
            col.textContent = "Multa Pós-Diretoria";
        }
    }

    const btnPen = document.getElementById("btnMetricaPenalidade");
    const btnMulta = document.getElementById("btnMetricaMulta");
    const btnDiretoria = document.getElementById("btnMetricaDiretoria");

    [btnPen, btnMulta, btnDiretoria].forEach(btn => {
        if (btn) btn.classList.remove("active");
    });

    if (tipo === "penalidade") {
        btnPen?.classList.add("active");
    }

    else if (tipo === "multa") {
        btnMulta?.classList.add("active");
    }

    else {
        btnDiretoria?.classList.add("active");
    }

    Object.keys(charts).forEach(id => {
        charts[id].destroy();
        delete charts[id];
    });

    aplicarFiltros();
    if (visaoNCAtiva) {
    atualizarGraficosNC();
}
}
// =========================
// TOOLTIP LEGENDA
// =========================
(function() {
    let _tooltipEl = null;

    function getTooltipEl() {
        if (!_tooltipEl) {
            _tooltipEl = document.createElement("div");
            _tooltipEl.id = "legendTooltip";
            _tooltipEl.style.cssText = [
                "position:fixed",
                "z-index:9999",
                "background:#1e293b",
                "color:#f8fafc",
                "padding:6px 10px",
                "border-radius:6px",
                "font-size:12px",
                "font-weight:500",
                "pointer-events:none",
                "white-space:normal",
                "max-width:280px",
                "line-height:1.4",
                "box-shadow:0 4px 12px rgba(0,0,0,0.25)",
                "display:none"
            ].join(";");
            document.body.appendChild(_tooltipEl);
        }
        return _tooltipEl;
    }

    window.mostrarTooltipLegenda = function(nativeEvent, texto) {
        const el = getTooltipEl();
        el.textContent = texto;
        el.style.display = "block";

        const x = nativeEvent.clientX;
        const y = nativeEvent.clientY;
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Posiciona à direita do cursor, ajusta se sair da tela
        let left = x + 12;
        let top = y - 8;

        el.style.left = "0px";
        el.style.top = "0px";
        const w = el.offsetWidth;
        const h = el.offsetHeight;

        if (left + w > vw - 8) left = x - w - 12;
        if (top + h > vh - 8) top = vh - h - 8;
        if (top < 4) top = 4;

        el.style.left = left + "px";
        el.style.top = top + "px";
    };

    window.esconderTooltipLegenda = function() {
        const el = getTooltipEl();
        if (el) el.style.display = "none";
    };
})();


let choicesInstances = {};

function iniciarMultiselect() {

    ["filtroDistribuidora", "filtroGrupo", "filtroPenalidade","filtroEstado","filtroTema","filtroNC"]
    .forEach(id => {

        if (choicesInstances[id]) {
            choicesInstances[id].destroy();
        }

        const select = document.getElementById(id);

    const instance = new Choices(select, {
    removeItemButton: true,
    searchEnabled: true,
    shouldSort: false,
    itemSelectText: "",
    placeholder: false,
    noResultsText: "Nenhum resultado",
    noChoicesText: "Sem opções"
});
        choicesInstances[id] = instance;
    });
}

function inicializarEventos() {
    const btnTema = document.getElementById("btnTema");

if (btnTema) {
    btnTema.onclick = alternarGraficoTema;
}
    const btnPen = document.getElementById("btnMetricaPenalidade");
    const btnMulta = document.getElementById("btnMetricaMulta");
    const btnDiretoria = document.getElementById("btnMetricaDiretoria");
    const btnLimpar = document.getElementById("btnLimpar");

    console.log("BTN PEN:", btnPen);
    console.log("BTN MULTA:", btnMulta);

    if (btnPen) {
        btnPen.onclick = () => {
            console.log("clicou penalidade");
            alternarMetrica("penalidade");
        };
    }

    if (btnMulta) {
        btnMulta.onclick = () => {
            console.log("clicou multa");
            alternarMetrica("multa");
        };
    }

    if (btnDiretoria) {
    btnDiretoria.onclick = () => {
        console.log("clicou diretoria");
        alternarMetrica("diretoria");
    };
}

    if (btnLimpar) {
        btnLimpar.onclick = limparFiltroGrafico;
    }
}
const btnNC =
    document.getElementById("btnVisaoNC");

if (btnNC) {

    btnNC.onclick = alternarVisaoNC;
}

// EXECUTA DIRETO (sem depender de evento)
inicializarEventos();
carregarDados();
window.addEventListener("load", () => {

    setTimeout(() => {

        atualizarGraficos();
        atualizarGraficoEstado();
        atualizarGraficoRazaoUC();
        atualizarGraficoTema();

        if (visaoNCAtiva) {
            atualizarGraficosNC();
        }

        Object.values(charts).forEach(chart => {
            try {
                chart.resize();
                chart.update();
            } catch(e){}
        });

        verificarEReconstruirGraficosMobile();

    }, 1000);

});
carregarManualRegulatorio();

// =========================
// FIX MOBILE: ResizeObserver nos containers de gráfico
// Garante que Chart.js redimensiona corretamente após filtros no mobile
// =========================
function aplicarResizeObserver() {
    if (typeof ResizeObserver === "undefined") return;

    document.querySelectorAll(".grafico-container").forEach(container => {
        if (container._resizeObserver) return;

        const observer = new ResizeObserver(() => {
            container.querySelectorAll("canvas").forEach(canvas => {
                const id = canvas.id;
                if (charts[id]) {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            if (charts[id]) charts[id].resize();
                        });
                    });
                }
            });
        });

        observer.observe(container);
        container._resizeObserver = observer;
    });
}

// Aplica ResizeObserver após dados carregados
setTimeout(aplicarResizeObserver, 1000);
// =========================
// MANUAL DE DADOS
// =========================

// Cache dos dados do CSV do manual regulatório
let _dadosManualRegulatorio = null;

async function carregarManualRegulatorio() {
    try {
        const response = await fetch("./manual_regulatorio.csv");
        const texto = await response.text();

        const resultado = Papa.parse(texto, {
            header: true,
            skipEmptyLines: true
        });

        _dadosManualRegulatorio = resultado.data;
    } catch (e) {
        console.error("Erro ao carregar manual_regulatorio.csv:", e);
        _dadosManualRegulatorio = [];
    }
}
const MAPA_ARTIGO_EXIBICAO = {
    "Art. 13.  Inciso VI": "VI - praticar tarifas de uso ou conexão na transmissão ou na distribuição em valores superiores aos estabelecidos;",
    "Art. 13. Inciso VII": "VII - deixar de assegurar livre acesso aos sistemas de transmissão ou distribuição de energia elétrica, ou de efetuar o atendimento a acessantes nos prazos e nas condições estabelecidas;",
    "Art. 13.  Inciso XI": "XI - praticar conduta que atente contra a concorrência efetiva ou a ordem econômica;",
    "Art. 13. Inciso II": "II - provocar, dar causa ou permitir a propagação de distúrbio que ocasione o desligamento de consumidores;",

    "Art. 12. Inciso I, Alínea \"a\"": "I - descumprir às disposições legais, regulamentares e contratuais relativas: a) aos níveis de qualidade dos serviços de energia elétrica;",
    "Art. 12.  Inciso II": "II - deixar de realizar as obras essenciais à prestação de serviço adequado;",
    "Art. 12.  Inciso III": "III - deixar de atender pedido de serviços nos prazos e nas condições estabelecidas na legislação ou no contrato;",
    "Art. 12. Inciso IV": "IV - descumprir aos prazos estabelecidos nos atos de delegação de concessões, permissões ou autorizações para implantar instalações de energia elétrica;",
    "Art. 12 Inciso V": "V - implantar, operar ou manter instalações de energia elétrica e os respectivos equipamentos de forma inadequada, em face dos requisitos legais, regulamentares ou contratuais aplicáveis;",
    "Art. 12.  Inciso VI": "VI - deixar de realizar a contabilização em conformidade com as normas, procedimentos ou instruções legais ou regulamentares;",
    "Art. 12.  Inciso VII": "VII - deixar de encaminhar, para exame e aprovação da ANEEL, nas hipóteses e condições contratuais, legais ou regulamentares;",
    "Art. 12.  Inciso XI": "XI - criar óbice ou dificuldade ao acesso às instalações necessárias à atividade de fiscalização;",
    "Art. 12.  Inciso XII": "XII - deixar de atender ao mercado consumidor, de forma abrangente, nos termos da legislação ou da concessão;",
    "Art. 12.  Inciso XIII": "XIII - impor ônus para o solicitante ou consumidor na prestação do serviço público em desacordo com as disposições legais ou regulamentares;",
    "Art. 12.  Inciso XXI": "XXI - descumprir disposições legais, regulamentares, contratuais ou constantes do ato de concessão, permissão ou autorização relativas à gestão dos recursos econômico-financeiros;",

    "Art. 11.  Inciso I": "I - deixar de instituir ou de prover condições para o adequado funcionamento da Ouvidoria ou do Conselho de Consumidores;",
    "Art. 11.  Inciso V": "V - deixar de enviar ou disponibilizar à ANEEL, nos prazos e nas condições estabelecidas na legislação, documentos ou informações econômicas e financeiras;",
    "Art. 11.  Inciso VII": "VII - deixar de cumprir ao disposto nos Procedimentos de Distribuição;",
    "Art. 11.  Inciso VIII": "VIII - deixar de cumprir ao disposto nos Procedimentos de Rede;",
    "Art. 11.  Inciso X": "X - deixar de cumprir ao disposto nas Condições Gerais de Fornecimento de Energia Elétrica e nas Regras de Prestação do Serviço Público de Distribuição de Energia Elétrica;",
    "Art. 11.  Inciso XI": "XI - deixar de cumprir ao disposto na Convenção, nas Regras, nos Procedimentos de Comercialização ou na Convenção Arbitral celebrada entre os agentes e a CCEE;",
    "Art. 11. inciso XIII": "XIII - deixar de cumprir ao disposto nos contratos de permissão ou concessão;",
    "Art. 11.  inciso XXI": "XXI - deixar de cumprir determinação da Diretoria Colegiada da ANEEL, no prazo estabelecido;",

    "Art. 10 Inciso I": "I - deixar de manter registro atualizado das reclamações e solicitações dos consumidores;",
    "Art. 10. Inciso XVIII": "XVIII - realizar leitura ou faturamento em desacordo com a legislação;",
    "Art. 10. Inciso XX": "XX - deixar de enviar ou disponibilizar à ANEEL informações ou documentos, nos prazos e nas condições estabelecidas na legislação.",

    "Art. 9.  Inciso III": "III - deixar de prestar informações aos consumidores ou usuários, quando solicitado ou conforme determinado nas disposições legais, regulamentares ou contratuais;",

    "Art. 5. Inciso IX": "IX - intervenção para adequação do serviço público de energia elétrica;",
    "Art. 5.  Inciso V": "V - obrigação de fazer;"
};

function abrirManual() {
    const pagina = document.getElementById("paginaManual");
    const dashboard = document.querySelector(".dashboard");
    if (!pagina) return;

    pagina.style.display = "block";
    if (dashboard) dashboard.style.display = "none";
    window.scrollTo(0, 0);

    preencherTabelaArtigos();
    preencherTabelaBase("");

    // reset busca
    const busca = document.getElementById("buscaManual");
    if (busca) busca.value = "";
}

function fecharManual() {
    const pagina = document.getElementById("paginaManual");
    const dashboard = document.querySelector(".dashboard");
    if (!pagina) return;

    pagina.style.display = "none";
    if (dashboard) dashboard.style.display = "";
}

function preencherTabelaArtigos() {
    const tbody = document.getElementById("tbodyArtigos");
    if (!tbody) return;

    // Prioridade: dados do CSV (tem REN 63)
    if (_dadosManualRegulatorio && _dadosManualRegulatorio.length > 0) {
        tbody.innerHTML = _dadosManualRegulatorio.map(linha => `
            <tr>
                <td><span class="artigo-badge">${linha.artigo_846 || ""}</span></td>
                <td>${MAPA_ARTIGO_DETALHE[normArtigo(linha.artigo_846)] || ""}</td>
                <td><span class="artigo-badge">${linha.artigo_63 || ""}</span></td>
                <td>${linha.descricao_63 || ""}</td>
            </tr>
        `).join("");
        return;
    }

    // Fallback: MAPA_ARTIGO_EXIBICAO (sem REN 63)
    const entradas = Object.entries(MAPA_ARTIGO_EXIBICAO)
        .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));

    tbody.innerHTML = entradas.map(([artigo, descricao]) =>
        `<tr>
            <td><span class="artigo-badge">${artigo}</span></td>
            <td>${descricao}</td>
            <td></td>
            <td></td>
        </tr>`
    ).join("");
}

function preencherTabelaBase(filtro) {
    const tbody = document.getElementById("tbodyBase");
    const contagem = document.getElementById("manual-contagem");
    if (!tbody) return;

    const termo = (filtro || "").toLowerCase().trim();

    const registros = dados.filter(item => {
        if (!termo) return true;
        const texto = [
            item.distribuidora, item.grupo, item.estado,
            item.tema, item.tipoPenalidade, item.auto,
            item.ano, ...(item.ncs || [])
        ].join(" ").toLowerCase();
        return texto.includes(termo);
    });

    if (contagem) {
        contagem.textContent = `${registros.length.toLocaleString("pt-BR")} registros`;
    }

    const fmtValor = v =>
        (v !== null && v !== undefined && v !== 0)
            ? `<td class="valor-monetario">${formatarMoeda(v)}</td>`
            : `<td class="valor-vazio">—</td>`;

    const fmtNC = v =>
        v ? `<td>${v}</td>` : `<td class="valor-vazio">—</td>`;

    const exibir = registros.slice(0, 2000);

    tbody.innerHTML = exibir.map(item => {
        const ncs = item.ncs || [];
        return `<tr>
            <td>${item.distribuidora}</td>
            <td>${item.grupo}</td>
            <td>${item.estado}</td>
            <td>${item.tema}</td>
            <td>${item.tipoPenalidade}</td>
            ${fmtValor(item.penalidade)}
            ${fmtValor(item.multa)}
            ${fmtValor(item.multaDiretoria)}
            <td>${item.auto || "—"}</td>
            <td>${item.ano || "—"}</td>
            ${fmtNC(ncs[0])}
            ${fmtNC(ncs[1])}
            ${fmtNC(ncs[2])}
            ${fmtNC(ncs[3])}
            ${fmtNC(ncs[4])}
        </tr>`;
    }).join("");

    if (registros.length > 2000) {
        const aviso = document.createElement("tr");
        aviso.innerHTML = `<td colspan="15" style="text-align:center;padding:14px;color:#64748b;font-size:12px;font-style:italic;">
            Exibindo 2.000 de ${registros.length.toLocaleString("pt-BR")} registros. Use a busca para refinar.
        </td>`;
        tbody.appendChild(aviso);
    }
}

// Vincula eventos do manual diretamente (sem DOMContentLoaded, pois o script roda após o HTML)
(function inicializarManual() {
    const btnManual = document.getElementById("btnManual");
    if (btnManual) btnManual.addEventListener("click", abrirManual);

    const btnVoltar = document.getElementById("btnVoltarManual");
    if (btnVoltar) btnVoltar.addEventListener("click", fecharManual);

    const buscaManual = document.getElementById("buscaManual");
    if (buscaManual) {
        let debounceTimer;
        buscaManual.addEventListener("input", function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => preencherTabelaBase(this.value), 300);
        });
    }
})();