// js/agenda.js

async function carregarAgenda() {
  const container = document.getElementById("conteudo-dinamico");
  if (!container) return;

  try {
    let usuario = currentUser;
    if (!usuario) {
      const userStr = localStorage.getItem("user");
      if (userStr) usuario = JSON.parse(userStr);
    }

    const isEstabelecimento = usuario?.tipo === "estabelecimento";
    let eventos = [];
    let favoritosEventos = [];
    let favoritosSet = new Set();

    // Buscar favoritos do usuário (se estiver logado e não for estabelecimento)
    if (!isEstabelecimento && token) {
      favoritosEventos = await apiRequest("/api/favoritos-eventos");
      favoritosSet = new Set(favoritosEventos.map((f) => f.eventoId));
    }

    if (isEstabelecimento) {
      const usuarioCompleto = await apiRequest("/api/usuarios/me", "GET");
      const estabelecimentoId = usuarioCompleto.estabelecimento?.id;
      if (estabelecimentoId) {
        eventos = await apiRequest(
          `/api/eventos?estabelecimentoId=${estabelecimentoId}`,
        );
      }
    } else {
      const agendaItems = await apiRequest("/api/agenda");
      eventos = agendaItems.map((item) => ({
        ...item.evento,
        agendaId: item.id,
      }));
    }

    // Ordenar por data (mais próximo primeiro)
    eventos.sort((a, b) => new Date(a.dataHora) - new Date(b.dataHora));

    if (eventos.length === 0) {
      container.innerHTML = `<p class="text-[#94A3B8] text-center py-8">${
        isEstabelecimento
          ? "Nenhum evento criado. Clique no + para criar."
          : "Sua agenda está vazia. Clique no + para adicionar eventos."
      }</p>`;
    } else {
      container.innerHTML = eventos
        .map((ev) => {
          const dataFormatada = new Date(ev.dataHora).toLocaleString();
          const fotoUrl = ev.foto ? `${API_URL}${ev.foto}` : null;
          const isFav = favoritosSet.has(ev.id);

          // Template para usuários comuns
          if (!isEstabelecimento) {
            return `
              <div class="bg-[#1E293B] rounded-xl p-3 flex justify-between items-center cursor-pointer" data-id="${ev.id}">
                <div class="flex items-center gap-3 flex-1">
                  ${fotoUrl ? `<img src="${fotoUrl}" class="w-12 h-12 rounded-lg object-cover">` : `<div class="w-12 h-12 rounded-lg bg-[#334155] flex items-center justify-center text-[#94A3B8]"><i class="fas fa-image"></i></div>`}
                  <div>
                    <h3 class="text-white font-bold">${ev.nome}</h3>
                    <p class="text-[#94A3B8] text-sm">${dataFormatada}</p>
                    <p class="text-xs text-[#22C55E]">${ev.estabelecimento?.usuario?.nome || "Estabelecimento"}</p>
                    ${ev.preco ? `<p class="text-xs text-[#F59E0B]">R$ ${ev.preco}</p>` : ""}
                  </div>
                </div>
                <div class="flex gap-2">
                  <button class="removeAgendaBtn text-red-400 hover:text-red-600" data-id="${ev.agendaId}">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                  <button class="favEventoAgendaBtn text-2xl ${isFav ? "text-red-500" : "text-[#94A3B8]"}" data-id="${ev.id}">
                    <i class="fas fa-heart"></i>
                  </button>
                </div>
              </div>
            `;
          } else {
            // Template para estabelecimentos
            return `
              <div class="bg-[#1E293B] rounded-xl p-3 flex justify-between items-center cursor-pointer" data-id="${ev.id}">
                <div class="flex items-center gap-3 flex-1">
                  ${fotoUrl ? `<img src="${fotoUrl}" class="w-12 h-12 rounded-lg object-cover">` : `<div class="w-12 h-12 rounded-lg bg-[#334155] flex items-center justify-center text-[#94A3B8]"><i class="fas fa-image"></i></div>`}
                  <div>
                    <h3 class="text-white font-bold">${ev.nome}</h3>
                    <p class="text-[#94A3B8] text-sm">${dataFormatada}</p>
                    <p class="text-xs text-[#22C55E]">${ev.estabelecimento?.usuario?.nome || "Estabelecimento"}</p>
                    ${ev.preco ? `<p class="text-xs text-[#F59E0B]">R$ ${ev.preco}</p>` : ""}
                  </div>
                </div>
                <div class="flex gap-2">
                  <button class="editEventoBtn text-[#7C3AED] hover:text-[#A78BFA]" data-id="${ev.id}">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="deleteEventoBtn text-red-400 hover:text-red-600" data-id="${ev.id}">
                    <i class="fas fa-trash-alt"></i>
                  </button>
                </div>
              </div>
            `;
          }
        })
        .join("");
    }

    // Remover evento da agenda (usuário comum)
    if (!isEstabelecimento) {
      document.querySelectorAll(".removeAgendaBtn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const agendaId = btn.dataset.id;
          try {
            await apiRequest(`/api/agenda/${agendaId}`, "DELETE");
            showToast("Evento removido da agenda");
            carregarAgenda();
          } catch (err) {
            showToast(err.message);
          }
        });
      });

      // Favoritar/desfavoritar eventos na agenda
      document.querySelectorAll(".favEventoAgendaBtn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const eventoId = btn.dataset.id;
          const isFavNow = btn.classList.contains("text-red-500");
          try {
            if (isFavNow) {
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
                const index = favoritosEventos.findIndex(
                  (f) => f.id === favorito.id,
                );
                if (index !== -1) favoritosEventos.splice(index, 1);
                favoritosSet.delete(parseInt(eventoId));
              } else {
                showToast("Erro: favorito não encontrado");
              }
            } else {
              const novoFav = await apiRequest(
                "/api/favoritos-eventos",
                "POST",
                { eventoId },
              );
              showToast("Evento favoritado!");
              btn.classList.add("text-red-500");
              btn.classList.remove("text-[#94A3B8]");
              favoritosEventos.push({
                id: novoFav.id,
                eventoId: novoFav.eventoId,
              });
              favoritosSet.add(parseInt(eventoId));
            }
          } catch (err) {
            showToast(err.message);
          }
        });
      });
    }

    // Editar e excluir eventos (estabelecimento)
    if (isEstabelecimento) {
      document.querySelectorAll(".editEventoBtn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const eventoId = btn.dataset.id;
          if (typeof abrirModalEditarEvento === "function") {
            abrirModalEditarEvento(eventoId);
          } else {
            showToast("Função de edição não disponível");
          }
        });
      });

      document.querySelectorAll(".deleteEventoBtn").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const eventoId = btn.dataset.id;
          if (confirm("Tem certeza que deseja excluir este evento?")) {
            try {
              await apiRequest(`/api/eventos/${eventoId}`, "DELETE");
              showToast("Evento excluído com sucesso!");
              carregarAgenda();
              if (typeof carregarPerfil === "function") carregarPerfil();
            } catch (err) {
              showToast(err.message);
            }
          }
        });
      });
    }

    // ---------- CLIQUE NO CARD PARA ABRIR MODAL DE DETALHES ----------
    document
      .querySelectorAll("#conteudo-dinamico [data-id]")
      .forEach((card) => {
        card.addEventListener("click", (e) => {
          // Impede que cliques nos botões de ação disparem o modal
          if (
            e.target.closest(".removeAgendaBtn") ||
            e.target.closest(".favEventoAgendaBtn") ||
            e.target.closest(".editEventoBtn") ||
            e.target.closest(".deleteEventoBtn")
          )
            return;
          const eventoId = card.dataset.id;
          if (eventoId && typeof abrirModalDetalhesEvento === "function") {
            abrirModalDetalhesEvento(eventoId);
          }
        });
      });

    // ---------- BOTÃO FLUTUANTE ----------
    const floatingContainer = document.getElementById("floating-elements");
    if (!floatingContainer) return;

    const oldFab = document.getElementById("fabAgenda");
    if (oldFab) oldFab.remove();

    const fab = document.createElement("button");
    fab.id = "fabAgenda";
    fab.className =
      "absolute right-4 w-14 h-14 rounded-full bg-[#7C3AED] text-white text-2xl shadow-lg hover:bg-[#6D28D9] transition flex items-center justify-center pointer-events-auto";
    fab.style.setProperty("bottom", "120px", "important");
    fab.style.setProperty("right", "20px", "important");
    fab.innerHTML = '<i class="fas fa-plus"></i>';
    fab.onclick = async () => {
      if (isEstabelecimento) {
        const usuarioCompleto = await apiRequest("/api/usuarios/me", "GET");
        const estabelecimentoId = usuarioCompleto.estabelecimento?.id;
        if (estabelecimentoId) {
          if (typeof abrirModalCriarEvento === "function") {
            abrirModalCriarEvento(estabelecimentoId);
          } else {
            showToast("Função de criação não disponível");
          }
        } else {
          showToast("Erro: perfil de estabelecimento não encontrado");
        }
      } else {
        carregarPagina("home");
      }
    };
    floatingContainer.appendChild(fab);
  } catch (err) {
    console.error(err);
    container.innerHTML =
      '<p class="text-red-400 text-center">Erro ao carregar agenda.</p>';
  }
}

function removerBotaoAgenda() {
  const btn = document.getElementById("fabAgenda");
  if (btn) btn.remove();
}
