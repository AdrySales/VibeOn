// js/home.js

let eventosGlobais = [];
let cidadesSet = new Set();
let filtroDataAtual = "todos";
let cidadeAtual = "todas";
let paginaAtual = 1;
const EVENTOS_POR_PAGINA = 5;

function extrairCidade(endereco) {
  if (!endereco) return null;
  // Remove o CEP no final (padrão: 5 dígitos - 3 dígitos, ou 8 dígitos)
  let semCep = endereco.replace(/\b\d{5}-?\d{3}\b/g, "").trim();
  // Divide por vírgula
  const partes = semCep.split(",").map((p) => p.trim());
  if (partes.length < 2) return null;
  // A cidade geralmente é a penúltima parte antes do estado (se houver)
  let cidade = partes[partes.length - 1];
  // Se a última parte for um estado (ex: "PB", "SP", "RJ"), pega a anterior
  if (/^[A-Z]{2}$/.test(cidade) && partes.length >= 2) {
    cidade = partes[partes.length - 2];
  }
  // Remove o estado que possa estar junto (ex: "João Pessoa - PB")
  cidade = cidade.replace(/-\s*[A-Z]{2}$/, "").trim();
  // Remove possíveis números ou caracteres estranhos
  cidade = cidade.replace(/^\d+\s*/, "").replace(/\s+\d+$/, "");
  if (cidade.length >= 3) return cidade;
  return null;
}
async function carregarHome() {
  // Avatar e nome do usuário
  let usuario = currentUser;
  if (!usuario) {
    const userStr = localStorage.getItem("user");
    if (userStr) usuario = JSON.parse(userStr);
  }
  const nomeSpan = document.getElementById("homeNome");
  if (nomeSpan && usuario) nomeSpan.textContent = usuario.nome || "Usuário";
  const avatarDiv = document.getElementById("homeAvatar");
  if (avatarDiv && usuario) {
    let fotoUrl = null;
    if (usuario.tipo === "estabelecimento" && usuario.estabelecimento?.foto) {
      fotoUrl = `${API_URL}${usuario.estabelecimento.foto}`;
    } else if (usuario.foto) {
      fotoUrl = `${API_URL}${usuario.foto}`;
    }
    if (fotoUrl) {
      avatarDiv.innerHTML = `<img src="${fotoUrl}" class="w-full h-full rounded-full object-cover">`;
      avatarDiv.classList.remove(
        "bg-[#7C3AED]",
        "justify-center",
        "items-center",
      );
      avatarDiv.style.backgroundColor = "transparent";
    } else {
      avatarDiv.innerHTML = usuario.nome
        ? usuario.nome.charAt(0).toUpperCase()
        : "U";
      avatarDiv.classList.add(
        "bg-[#7C3AED]",
        "flex",
        "items-center",
        "justify-center",
      );
      avatarDiv.style.backgroundColor = "";
    }
  }

  const container = document.getElementById("conteudo-dinamico");
  if (!container) return;

  try {
    eventosGlobais = await apiRequest("/api/eventos");
    // Extrair cidades
    eventosGlobais.forEach((ev) => {
      let cidade = ev.estabelecimento?.cidade;
      if (cidade) {
        cidade = cidade.trim(); // remove espaços extras
        cidadesSet.add(cidade);
      }
    });
    popularSelectCidades();

    let favoritosEventos = [];
    if (token) {
      favoritosEventos = await apiRequest("/api/favoritos-eventos");
    }
    const favoritosSet = new Set(favoritosEventos.map((f) => f.eventoId));

    // Renderiza as seções fixas
    renderizarDestaques(eventosGlobais, favoritosSet);
    renderizarPertoDeVoce(eventosGlobais, favoritosSet);
    aplicarFiltros(eventosGlobais, favoritosSet);

    // Filtros de data
    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.removeEventListener("click", handleFilterClick);
      btn.addEventListener("click", handleFilterClick);
    });

    const cidadeSelect = document.getElementById("cidadeSelect");
    if (cidadeSelect) {
      cidadeSelect.removeEventListener("change", handleCidadeChange);
      cidadeSelect.addEventListener("change", handleCidadeChange);
    }

    // Botões "Ver todos" e "Explorar"
    const btnVerTodos = document.getElementById("verTodosDestaques");
    const btnExplorar = document.getElementById("verTodosPerto");
    if (btnVerTodos) {
      btnVerTodos.addEventListener("click", () => scrollToListagem());
    }
    if (btnExplorar) {
      btnExplorar.addEventListener("click", () => scrollToListagem());
    }

    // Adicionar eventos de clique nos cards para abrir modal
    adicionarEventosCliqueCards();
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<p class="text-red-400 text-center">Erro ao carregar eventos.</p>';
  }
}

function scrollToListagem() {
  const listagem = document.getElementById("conteudo-dinamico");
  if (listagem) {
    listagem.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function handleFilterClick(e) {
  const btn = e.currentTarget;
  document.querySelectorAll(".filter-btn").forEach((b) => {
    b.classList.remove("bg-[#7C3AED]", "text-white");
    b.classList.add("bg-transparent", "text-[#94A3B8]");
  });
  btn.classList.remove("bg-transparent", "text-[#94A3B8]");
  btn.classList.add("bg-[#7C3AED]", "text-white");
  filtroDataAtual = btn.dataset.filter;
  paginaAtual = 1;
  aplicarFiltros(eventosGlobais, new Set());
}

function handleCidadeChange(e) {
  cidadeAtual = e.target.value;
  paginaAtual = 1;
  aplicarFiltros(eventosGlobais, new Set());
}

function popularSelectCidades() {
  const select = document.getElementById("cidadeSelect");
  if (!select) return;
  select.innerHTML = '<option value="todas">Todas as cidades</option>';
  const cidades = Array.from(cidadesSet).sort();
  cidades.forEach((cidade) => {
    const option = document.createElement("option");
    option.value = cidade;
    option.textContent = cidade;
    select.appendChild(option);
  });
}

// FILTROS
function filtrarEventosPorData(eventos, filtro) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);
  const sexta = new Date(hoje);
  const diasParaSexta = (5 - hoje.getDay() + 7) % 7;
  sexta.setDate(hoje.getDate() + diasParaSexta);
  const domingo = new Date(sexta);
  domingo.setDate(sexta.getDate() + 2);
  domingo.setHours(23, 59, 59, 999);
  return eventos.filter((ev) => {
    const dataEv = new Date(ev.dataHora);
    if (filtro === "hoje") return dataEv.toDateString() === hoje.toDateString();
    if (filtro === "amanha")
      return dataEv.toDateString() === amanha.toDateString();
    if (filtro === "fim_semana") return dataEv >= sexta && dataEv <= domingo;
    return true; // "todos"
  });
}

function normalizarTexto(texto) {
  if (!texto) return "";
  return texto
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function filtrarEventosPorCidade(eventos, cidade) {
  if (cidade === "todas") return eventos;
  console.log("Cidade selecionada:", cidade); // ← ADICIONE AQUI
  return eventos.filter((ev) => {
    const cidadeEvento = ev.estabelecimento?.cidade;
    console.log("Cidade do evento:", cidadeEvento); // ← E AQUI
    console.log(cidadeAtual);
    return cidadeEvento === cidade;
  });
}
async function aplicarFiltros(eventos, favoritosSetAntigo) {
  let favoritosEventos = [];
  if (token) {
    try {
      favoritosEventos = await apiRequest("/api/favoritos-eventos");
    } catch (e) {
      console.warn(e);
    }
  }
  const favoritosSet = new Set(favoritosEventos.map((f) => f.eventoId));
  let filtrados = filtrarEventosPorData(eventos, filtroDataAtual);
  filtrados = filtrarEventosPorCidade(filtrados, cidadeAtual);
  // Agora, renderize todas as seções com os eventos filtrados
  renderizarDestaques(filtrados, favoritosSet);
  renderizarPertoDeVoce(filtrados, favoritosSet);
  renderizarListaEventos(filtrados, favoritosSet);
}
// RENDERIZAÇÃO
function renderizarDestaques(eventos, favoritosSet) {
  const container = document.getElementById("destaquesContainer");
  if (!container) return;
  const destaques = eventos.slice(0, 3);
  if (destaques.length === 0) {
    container.innerHTML =
      '<p class="text-[#94A3B8]">Nenhum destaque disponível.</p>';
    return;
  }
  container.innerHTML = destaques
    .map((ev) => {
      const dataFormatada = new Date(ev.dataHora)
        .toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })
        .toUpperCase();
      const fotoUrl = ev.foto ? `${API_URL}${ev.foto}` : null;
      const isFav = favoritosSet.has(ev.id);
      return `
        <div class="min-w-[250px] bg-[#1E293B] rounded-xl overflow-hidden shadow-md flex-shrink-0 cursor-pointer" data-id="${ev.id}">
          ${fotoUrl ? `<img src="${fotoUrl}" class="h-32 w-full object-cover">` : `<div class="h-32 w-full bg-[#334155] flex items-center justify-center"><i class="fas fa-image text-4xl text-[#94A3B8]"></i></div>`}
          <div class="p-3">
            <div class="flex justify-between items-start">
              <div>
                <p class="text-[#22C55E] text-xs font-bold">${dataFormatada}</p>
                <h4 class="text-white font-bold text-md">${ev.nome.replace(/['"]/g, "&quot;")}</h4>
                <p class="text-[#94A3B8] text-xs mt-1">${ev.estabelecimento?.usuario?.nome || ""}</p>
              </div>
              <button class="favEventoBtn text-xl ${isFav ? "text-red-500" : "text-[#94A3B8]"}" data-id="${ev.id}">
                <i class="fas fa-heart"></i>
              </button>
            </div>
            <button class="addAgendaBtn w-full mt-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-1 rounded-full text-xs transition flex items-center justify-center gap-1" data-id="${ev.id}">
              <i class="fas fa-calendar-plus"></i> Agenda
            </button>
          </div>
        </div>
      `;
    })
    .join("");
  attachButtonEvents();
}

function renderizarPertoDeVoce(eventos, favoritosSet) {
  const container = document.getElementById("pertoContainer");
  if (!container) return;
  const perto = eventos.slice(0, 4);
  if (perto.length === 0) {
    container.innerHTML =
      '<p class="text-[#94A3B8]">Nenhum evento próximo encontrado.</p>';
    return;
  }
  container.innerHTML = perto
    .map((ev) => {
      const dataFormatada = new Date(ev.dataHora)
        .toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "numeric",
          month: "short",
        })
        .toUpperCase();
      const fotoUrl = ev.foto ? `${API_URL}${ev.foto}` : null;
      const isFav = favoritosSet.has(ev.id);
      return `
        <div class="bg-[#1E293B] rounded-xl p-3 flex flex-wrap sm:flex-nowrap gap-3 items-start cursor-pointer" data-id="${ev.id}">
          <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-[#334155] mx-auto sm:mx-0">
            ${fotoUrl ? `<img src="${fotoUrl}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center"><i class="fas fa-image text-2xl text-[#94A3B8]"></i></div>`}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex justify-between items-start gap-2 flex-wrap">
              <div class="flex-1">
                <p class="text-[#22C55E] text-xs font-bold">${dataFormatada}</p>
                <h4 class="text-white font-semibold text-sm break-words">${ev.nome.replace(/['"]/g, "&quot;")}</h4>
                <p class="text-[#94A3B8] text-xs break-words">${ev.estabelecimento?.usuario?.nome || ""} · ${Math.floor(Math.random() * 5) + 1} km</p>
              </div>
              <button class="favEventoBtn text-xl ${isFav ? "text-red-500" : "text-[#94A3B8]"}" data-id="${ev.id}">
                <i class="fas fa-heart"></i>
              </button>
            </div>
            <button class="addAgendaBtn w-full mt-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-1 rounded-full text-xs transition flex items-center justify-center gap-1" data-id="${ev.id}">
              <i class="fas fa-calendar-plus"></i> Adicionar à agenda
            </button>
          </div>
        </div>
      `;
    })
    .join("");
  attachButtonEvents();
}

function renderizarListaEventos(eventos, favoritosSet) {
  const container = document.getElementById("conteudo-dinamico");
  if (!container) return;

  const totalPaginas = Math.ceil(eventos.length / EVENTOS_POR_PAGINA);
  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas || 1;
  const inicio = (paginaAtual - 1) * EVENTOS_POR_PAGINA;
  const eventosPagina = eventos.slice(inicio, inicio + EVENTOS_POR_PAGINA);

  let html = `
    <div class="flex justify-between items-center mt-4 mb-2">
      <h3 class="text-white font-bold text-xl">Todos os Eventos</h3>
      <span class="text-[#94A3B8] text-xs">${eventos.length} eventos</span>
    </div>
  `;
  if (eventosPagina.length === 0) {
    html +=
      '<p class="text-[#94A3B8] text-center py-8">Nenhum evento encontrado.</p>';
  } else {
    html += eventosPagina
      .map((ev) => {
        const dataFormatada = new Date(ev.dataHora)
          .toLocaleDateString("pt-BR", {
            weekday: "short",
            day: "numeric",
            month: "short",
          })
          .toUpperCase();
        const horaFormatada = new Date(ev.dataHora).toLocaleTimeString(
          "pt-BR",
          { hour: "2-digit", minute: "2-digit" },
        );
        const fotoUrl = ev.foto ? `${API_URL}${ev.foto}` : null;
        const isFav = favoritosSet.has(ev.id);
        return `
      <div class="bg-[#1E293B] rounded-xl p-3 flex flex-wrap sm:flex-nowrap gap-3 items-start cursor-pointer" data-id="${ev.id}">
        <div class="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-[#334155] mx-auto sm:mx-0">
          ${fotoUrl ? `<img src="${fotoUrl}" class="w-full h-full object-cover">` : `<div class="w-full h-full flex items-center justify-center"><i class="fas fa-image text-2xl text-[#94A3B8]"></i></div>`}
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start gap-2 flex-wrap">
            <div class="flex-1">
              <p class="text-[#22C55E] text-xs font-bold">${dataFormatada} · ${horaFormatada}</p>
              <h4 class="text-white font-semibold text-sm break-words">${ev.nome.replace(/['"]/g, "&quot;")}</h4>
              <p class="text-[#94A3B8] text-xs break-words">${ev.estabelecimento?.usuario?.nome || ""}</p>
            </div>
            <button class="favEventoBtn text-xl ${isFav ? "text-red-500" : "text-[#94A3B8]"}" data-id="${ev.id}">
              <i class="fas fa-heart"></i>
            </button>
          </div>
          <button class="addAgendaBtn w-full mt-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-1 rounded-full text-xs transition flex items-center justify-center gap-1" data-id="${ev.id}">
            <i class="fas fa-calendar-plus"></i> Adicionar à agenda
          </button>
        </div>
      </div>
    `;
      })
      .join("");
  }
  if (totalPaginas > 1) {
    html += `
      <div class="flex justify-center gap-4 mt-6 pb-4">
        <button id="btnPaginaAnterior" class="bg-[#1E293B] text-white px-4 py-2 rounded-lg ${paginaAtual === 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-[#7C3AED]"} transition" ${paginaAtual === 1 ? "disabled" : ""}>Anterior</button>
        <span class="text-white py-2">Página ${paginaAtual} de ${totalPaginas}</span>
        <button id="btnPaginaProxima" class="bg-[#1E293B] text-white px-4 py-2 rounded-lg ${paginaAtual === totalPaginas ? "opacity-50 cursor-not-allowed" : "hover:bg-[#7C3AED]"} transition" ${paginaAtual === totalPaginas ? "disabled" : ""}>Próxima</button>
      </div>
    `;
  }
  container.innerHTML = html;
  if (totalPaginas > 1) {
    const btnAnt = document.getElementById("btnPaginaAnterior");
    const btnProx = document.getElementById("btnPaginaProxima");
    if (btnAnt && paginaAtual > 1) {
      btnAnt.addEventListener("click", () => {
        paginaAtual--;
        aplicarFiltros(eventosGlobais, favoritosSet);
      });
    }
    if (btnProx && paginaAtual < totalPaginas) {
      btnProx.addEventListener("click", () => {
        paginaAtual++;
        aplicarFiltros(eventosGlobais, favoritosSet);
      });
    }
  }
  attachButtonEvents();
}

function attachButtonEvents() {
  // Botões de agenda
  document.querySelectorAll(".addAgendaBtn").forEach((btn) => {
    btn.removeEventListener("click", handleAddAgenda);
    btn.addEventListener("click", handleAddAgenda);
  });
  // Botões de favoritar
  document.querySelectorAll(".favEventoBtn").forEach((btn) => {
    btn.removeEventListener("click", handleFavEvento);
    btn.addEventListener("click", handleFavEvento);
  });
  // Reaplica os listeners de clique nos cards para abrir o modal
  adicionarEventosCliqueCards();
}

async function handleAddAgenda(e) {
  e.stopPropagation();
  const eventoId = this.dataset.id;
  try {
    await apiRequest("/api/agenda", "POST", { eventoId });
    showToast("Adicionado à agenda!");
  } catch (err) {
    showToast(err.message);
  }
}

async function handleFavEvento(e) {
  e.stopPropagation();
  const btn = this;
  const eventoId = btn.dataset.id;
  const isFavNow = btn.classList.contains("text-red-500");
  try {
    if (isFavNow) {
      const favoritosAtuais = await apiRequest("/api/favoritos-eventos");
      const favorito = favoritosAtuais.find(
        (f) => f.eventoId === parseInt(eventoId),
      );
      if (favorito) {
        await apiRequest(`/api/favoritos-eventos/${favorito.id}`, "DELETE");
        showToast("Removido dos favoritos");
        btn.classList.remove("text-red-500");
        btn.classList.add("text-[#94A3B8]");
        setTimeout(() => carregarHome(), 300);
      } else {
        showToast("Erro: favorito não encontrado");
      }
    } else {
      await apiRequest("/api/favoritos-eventos", "POST", { eventoId });
      showToast("Evento favoritado!");
      btn.classList.add("text-red-500");
      btn.classList.remove("text-[#94A3B8]");
      setTimeout(() => carregarHome(), 300);
    }
  } catch (err) {
    showToast(err.message);
  }
}

// Função para abrir modal nos cards
function adicionarEventosCliqueCards() {
  document
    .querySelectorAll(
      "#destaquesContainer [data-id], #pertoContainer [data-id], #conteudo-dinamico [data-id]",
    )
    .forEach((card) => {
      card.removeEventListener("click", handleCardClick);
      card.addEventListener("click", handleCardClick);
    });
}

function handleCardClick(e) {
  if (e.target.closest(".addAgendaBtn") || e.target.closest(".favEventoBtn"))
    return;
  const eventoId = this.dataset.id;
  if (eventoId && typeof abrirModalDetalhesEvento === "function") {
    abrirModalDetalhesEvento(eventoId);
  }
}

// Inicializar
carregarHome();
