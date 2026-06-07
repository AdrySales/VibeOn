// js/home.js

async function carregarHome() {
  // Atualizar nome e avatar do usuário logado
  let usuario = currentUser;
  if (!usuario) {
    const userStr = localStorage.getItem("user");
    if (userStr) usuario = JSON.parse(userStr);
  }

  const nomeSpan = document.getElementById("homeNome");
  if (nomeSpan && usuario) {
    nomeSpan.textContent = usuario.nome || "Usuário";
  }

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

  // Carregar eventos e favoritos do usuário
  const container = document.getElementById("conteudo-dinamico");
  if (!container) return;

  try {
    // Buscar eventos e também os favoritos do usuário (se logado)
    const eventos = await apiRequest("/api/eventos");
    let favoritosEventos = [];
    if (token) {
      favoritosEventos = await apiRequest("/api/favoritos-eventos");
    }
    const favoritosSet = new Set(favoritosEventos.map((f) => f.eventoId));

    if (eventos.length === 0) {
      container.innerHTML =
        '<p class="text-[#94A3B8] text-center py-8">Nenhum evento disponível.</p>';
      return;
    }

    container.innerHTML = eventos
      .map((ev) => {
        const dataFormatada = new Date(ev.dataHora).toLocaleString();
        const fotoUrl = ev.foto ? `${API_URL}${ev.foto}` : null;
        const isFav = favoritosSet.has(ev.id);
        return `
        <div class="bg-[#1E293B] rounded-xl overflow-hidden shadow-md relative">
          ${fotoUrl ? `<img src="${fotoUrl}" class="w-full h-40 object-cover">` : `<div class="w-full h-40 bg-[#334155] flex items-center justify-center"><i class="fas fa-image text-4xl text-[#94A3B8]"></i></div>`}
          <div class="p-3">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-white font-bold text-lg">${ev.nome}</h3>
                <p class="text-[#94A3B8] text-sm">${dataFormatada}</p>
                <p class="text-xs text-[#22C55E] mt-1">${ev.estabelecimento?.usuario?.nome || "Estabelecimento"}</p>
                ${ev.preco ? `<p class="text-xs text-[#F59E0B] mt-1">R$ ${ev.preco}</p>` : ""}
              </div>
              <button class="favEventoBtn text-2xl ${isFav ? "text-red-500" : "text-[#94A3B8]"}" data-id="${ev.id}">
                <i class="fas fa-heart"></i>
              </button>
            </div>
            <button class="addAgendaBtn w-full mt-3 bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-1.5 rounded-full text-sm transition" data-id="${ev.id}">
              <i class="fas fa-calendar-plus mr-1"></i> Adicionar à agenda
            </button>
          </div>
        </div>
      `;
      })
      .join("");

    // Eventos dos botões "Adicionar à agenda"
    document.querySelectorAll(".addAgendaBtn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const eventoId = btn.dataset.id;
        try {
          await apiRequest("/api/agenda", "POST", { eventoId });
          showToast("Adicionado à agenda!");
        } catch (err) {
          showToast(err.message);
        }
      });
    });

    // Eventos dos botões de favoritar
    document.querySelectorAll(".favEventoBtn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        const eventoId = btn.dataset.id;
        const isFavNow = btn.classList.contains("text-red-500");
        try {
          if (isFavNow) {
            // Desfavoritar: encontrar o ID do favorito correspondente
            const favorito = favoritosEventos.find(
              (f) => f.eventoId === parseInt(eventoId),
            );
            if (favorito) {
              await apiRequest(
                `/api/favoritos-eventos/${favorito.id}`,
                "DELETE",
              );
              showToast("Removido dos favoritos");
              btn.classList.remove("text-red-500");
              btn.classList.add("text-[#94A3B8]");
              // Remove do array local
              const index = favoritosEventos.findIndex(
                (f) => f.id === favorito.id,
              );
              if (index !== -1) favoritosEventos.splice(index, 1);
            } else {
              showToast("Erro: favorito não encontrado");
            }
          } else {
            // Favoritar
            const novoFav = await apiRequest("/api/favoritos-eventos", "POST", {
              eventoId,
            });
            showToast("Evento favoritado!");
            btn.classList.add("text-red-500");
            btn.classList.remove("text-[#94A3B8]");
            favoritosEventos.push({
              id: novoFav.id,
              eventoId: novoFav.eventoId,
            });
          }
        } catch (err) {
          showToast(err.message);
        }
      });
    });
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<p class="text-red-400 text-center">Erro ao carregar eventos.</p>';
  }
}
