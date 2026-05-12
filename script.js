let dados = [];
let dadosFiltrados = [];
let charts = {};
let visaoAtual = "distribuidora";
let metricaAtual = "penalidade";
let modoGraficoTema = "tema";
let filtroGrafico = {
    campo: null,
    valores: []
};
let atualizando = false;

// =========================
// AUXILIARES
// ========================
Chart.defaults.animation = false;
function handleChartClick(id, valor) {

    let campo = null;

    if (id === "graficoDistribuidora" || id === "graficoGrupo") {
        campo = visaoAtual === "grupo" ? "grupo" : "distribuidora";
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

    let valor = 0;

    if (metricaAtual === "penalidade") {
        valor = item.penalidade;
    }

    else if (metricaAtual === "multa") {
        valor = item.multa;
    }

    else if (metricaAtual === "diretoria") {
        valor = item.multaDiretoria;
    }

    return Number(valor) || 0;
}

function isRegistroValido(item) {
    // precisa ter auto
    if (!item.auto || item.auto.trim() === "") return false;

    const valor = getValorMetrica(item);

    // 🔴 REGRA PRINCIPAL:
    if (metricaAtual === "penalidade") {
        return !isNaN(valor); // aceita 0
    } else {
        return valor > 0; // multa não aceita vazio/0
    }
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
            dados = resultado.data.map(item => ({
                distribuidora: item["Sigla_Distribuidora"]?.trim() || "Sem Sigla",
                grupo: item["Grupo_Distribuidora"]?.trim() || "Sem Grupo",
                estado: (item["Estado"] || "")
                .toString()
                .trim()
                .toUpperCase(),
                flag: item["Flag_Distribuidora"]?.trim() || "",
                tema: item["Resumo temas"]?.trim() || "Sem Tema",
                ano: Number(item["AnoLavratura"]) || null,
                mercado: parseValorMonetario(item["VlrMercado"]),
                penalidade: parseValorMonetario(item["VlrPenalidade"]),
              multa: parseValorMonetario(
                    item["VlrMultaAposJuizo"] ??
                    item["VlrMultaAposJuizo "] ??
                    item["VlrMultaApósJuízo"] ??
                    item["VlrMultaPosJuizo"] ??
                    0
                ),
                multaDiretoria: parseValorMonetario(
                                    item["VlrMultaAposDiretoria"] ??
                                    item["VlrMultaAposDiretoria "] ??
                                    0
                                ),
                tipoPenalidade: item["DscTipoPenalidade"]?.trim() || "Sem Tipo",
                auto: item["NumAutoInfracao"]?.trim() || ""
                
            }));

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

    [
        "filtroDistribuidora",
        "filtroGrupo",
        "filtroPenalidade",
        "sliderAnoInicio",
        "sliderAnoFim"
    ].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("change", aplicarFiltros);
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

function aplicarFiltros() {
    if (atualizando) return;
    atualizando = true;

    try {
        function getValoresSelecionados(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return [];

    const valores = Array.from(select.selectedOptions)
        .map(opt => opt.value)
    if (valores.includes("")) return [];

    return valores;
}
        const distribuidoras = getValoresSelecionados("filtroDistribuidora");
        const grupos = getValoresSelecionados("filtroGrupo");
        const tipos = getValoresSelecionados("filtroPenalidade");
        const anoInicio = Number(document.getElementById("sliderAnoInicio")?.value) || null;
        const anoFim = document.getElementById("sliderAnoFim")?.value;
        const anoFimNum = anoFim ? Number(anoFim) : null;
   

        atualizarLabelsAno();

        dadosFiltrados = dados.filter(item =>
            (distribuidoras.length === 0 || distribuidoras.includes(item.distribuidora)) &&
            (grupos.length === 0 || grupos.includes(item.grupo)) &&
            (tipos.length === 0 || tipos.includes(item.tipoPenalidade)) &&
            (!anoInicio || item.ano >= anoInicio) &&
            (!anoFimNum || item.ano <= anoFimNum) && 
            (!filtroGrafico.campo ||
            (
                filtroGrafico.valores &&
                filtroGrafico.valores.length > 0 &&
                filtroGrafico.valores.includes(String(item[filtroGrafico.campo]).trim())
            ))
        );

        atualizarCards();
        atualizarTabela();
            atualizarGraficos();
            atualizarGraficoTema();
            atualizarGraficoEstado();
            atualizarGraficoRazaoUC();


    } catch (e) {
        console.error("Erro em aplicarFiltros:", e);
    } finally {
        atualizando = false; 
    }
}
// =========================
// NC DISTRIBUIDORA
// =========================
function calcularNCDistribuidora(lista) {
    const mapa = {};

    lista.forEach(item => {
        const chave = item.distribuidora;
        const valor = Number(item.mercado);

        // 🔴 SÓ ENTRA SE EXISTE VALOR VÁLIDO
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
    charts[id].data.labels = labels;
    charts[id].data.datasets[0].data = valores;
    charts[id].data.datasets[0].label = titulo;

    charts[id].data.datasets[0].backgroundColor = corGrafico(labels);

    charts[id].update('none');
    return;
    }
    setTimeout(() => {
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
            const index = context.dataIndex;
            return (index + 1) + "°";
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
   charts[id].resize();
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
            dadosFiltrados.filter(item => item.auto),
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

    let labels = [];
    let datasets = [];

    if (modoGraficoTema === "tema") {
        const agrupado = agrupar(dadosFiltrados, "tema");

        const ordenado = Object.entries(agrupado)
            .sort((a, b) => b[1] - a[1]);

        labels = ordenado.map(x => x[0]);

        datasets = [{
            label: "Qtd Autos",
            data: ordenado.map(x => x[1]),
            borderRadius: 6,
            backgroundColor: corGrafico(labels)
        }];
    }

    else if (modoGraficoTema === "ano") {
        const agrupado = agrupar(dadosFiltrados, "ano");

        const ordenado = Object.entries(agrupado)
            .sort((a, b) => a[0] - b[0]);

        labels = ordenado.map(x => x[0]);

        datasets = [{
            label: "Qtd Autos",
            data: ordenado.map(x => x[1]),
            borderRadius: 6,
            backgroundColor: corGrafico(labels)
        }];
    }

    else {
        const temas = [...new Set(dadosFiltrados.map(x => x.tema || "Sem Tema"))];

        const anos = [...new Set(
            dadosFiltrados.map(x => x.ano).filter(Boolean)
        )].sort((a, b) => a - b);

        labels = anos;

        datasets = temas.map((tema, i) => ({
            label: tema,
            data: anos.map(ano =>
                dadosFiltrados.filter(x =>
                    (x.tema || "Sem Tema") === tema && x.ano === ano
                ).length
            ),
            stack: "stackTema",
            borderRadius: 4,
            backgroundColor: corPorTema(tema, i)
        }));
    }

    if (charts["graficoTema"]) {
        charts["graficoTema"].data.labels = labels;
        charts["graficoTema"].data.datasets = datasets;

        charts["graficoTema"].options.scales = {
            x: { stacked: modoGraficoTema === "temaAno" },
            y: { stacked: modoGraficoTema === "temaAno", beginAtZero: true }
        };

        charts["graficoTema"].update('none');
        return;
    }

    // CREATE
   charts["graficoTema"] = new Chart(canvas, {
    type: "bar",
    data: { labels, datasets },
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

            let valor;

            if (modoGraficoTema === "tema") {
                valor = chart.data.labels[index];
            } 
            else if (modoGraficoTema === "ano") {
                valor = chart.data.labels[index];
            } 
            else {
                // 🔥 empilhado → pega o tema (dataset)
                const datasetIndex = points[0].datasetIndex;
                valor = chart.data.datasets[datasetIndex].label;
            }

        let campo = modoGraficoTema === "ano" ? "ano" : "tema";

        if (
    filtroGrafico.campo === campo &&
    filtroGrafico.valores?.includes(valor)
) {
    // remove filtro
    filtroGrafico = { campo: null, valores: [] };

} else {

    // aplica filtro
    filtroGrafico = {
        campo,
        valores: [valor]
    };
}
aplicarFiltros();
        },

       plugins: {
            title: tituloPadrao(
                modoGraficoTema === "tema"
                    ? "Fiscalizações por Tema"
                    : modoGraficoTema === "ano"
                        ? "Fiscalizações por Ano"
                        : "Tema por Ano"
            ),
            legend: { position: "left" }
        },

        scales: {
            x: { stacked: modoGraficoTema === "temaAno" },
            y: { stacked: modoGraficoTema === "temaAno", beginAtZero: true }
        }
    }
});
}

// =========================
// GRÁFICO RAZÃO UC
// =========================
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
    charts["graficoRazaoUC"].data.labels = labels;
    charts["graficoRazaoUC"].data.datasets[0].backgroundColor = corGrafico(labels);
    charts["graficoRazaoUC"].data.datasets[1].data = qtdAutos;
    charts["graficoRazaoUC"].data.datasets[0].label =
    metricaAtual === "penalidade"
        ? "Razão UC"
        : "Razão UC";

charts["graficoRazaoUC"].options.plugins.title.text =
    metricaAtual === "penalidade"
        ? "Penalidade Normalizada"
        : "Multa Normalizada";
    charts["graficoRazaoUC"].update('none');
    return;
}

   charts["graficoRazaoUC"] = new Chart(canvas, {
    data: {
        labels: labels,
        datasets: [
            {
                type: "bar",
                label: "Razão UC",
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
                    data: qtdAutos,
                    yAxisID: "y1",
                    tension: 0.35,
                    pointRadius: 4,
                    borderColor: "#ef4444",      // cor da linha
                    backgroundColor: "#ef4444",  // cor dos pontos
                    pointBackgroundColor: "#ef4444"
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
    let base = dadosFiltrados.filter(item => item.estado);

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
}

// =========================
// TABELA
// =========================
function atualizarTabela() {
    const tbody = document.querySelector("#tabelaDados tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    dadosFiltrados.slice(0, 100).forEach(item => {
    tbody.innerHTML += `
        <tr>
            <td>${item.distribuidora}</td>
            <td>${item.grupo}</td>
            <td>${item.estado}</td>
            <td>${item.tema}</td>
            <td>${formatarMoeda(getValorMetrica(item))}</td>
            <td>${item.auto}</td>
        </tr>
    `;
    });
}

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

    const texto = btn.querySelector(".texto");

    if (visaoAtual === "distribuidora") {
        texto.textContent = "Alternar para Grupo";
    } else {
        texto.textContent = "Alternar para Distribuidora";
    }

    const icon = btn.querySelector(".icon");

if (visaoAtual === "distribuidora") {
    texto.textContent = "Alternar para Grupo";
    icon.textContent = "🏢";
} else {
    texto.textContent = "Alternar para Distribuidora";
    icon.textContent = "🏭";
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
    ["filtroDistribuidora", "filtroGrupo", "filtroPenalidade"].forEach(id => {
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
}
let choicesInstances = {};

function iniciarMultiselect() {

    ["filtroDistribuidora", "filtroGrupo", "filtroPenalidade"]
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

// EXECUTA DIRETO (sem depender de evento)
inicializarEventos();
carregarDados();