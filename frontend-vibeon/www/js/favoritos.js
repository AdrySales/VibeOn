// js/favoritos.js

let abaAtual = "estabelecimentos";

async function carregarFavoritos() {
  const container = document.getElementById("conteudo-dinamico");
  if (!container) return;

  try {
    if (abaAtual === "estabelecimentos") {
      const favoritos = await apiRequest("/api/favoritos");
      if (favoritos.length === 0) {
        container.innerHTML =
          '<p class="text-[#94A3B8] text-center py-8">Nenhum estabelecimento favoritado.</p>';
        return;
      }
      container.innerHTML = favoritos
        .map(
          (fav) => `
        <div class="bg-[#1E293B] rounded-xl p-3 flex justify-between items-center">
          <div>
            <h3 class="text-white font-bold">${fav.estabelecimento.nomeFantasia}</h3>
            <p class="text-[#94A3B8] text-sm">${fav.estabelecimento.categoria}</p>
            <p class="text-xs text-[#22C55E]">${fav.estabelecimento.endereco}</p>
          </div>
          <button class="removeFavEstabBtn text-red-400 hover:text-red-600" data-id="${fav.id}">
            <i class="fas fa-heart"></i>
          </button>
        </div>
      `,
        )
        .join("");
      // Remove listeners antigos e adiciona novos
      document.querySelectorAll(".removeFavEstabBtn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const favId = btn.dataset.id;
          await apiRequest(`/api/favoritos/${favId}`, "DELETE");
          showToast("Removido dos favoritos");
          carregarFavoritos();
        });
      });
    } else {
      // Buscar favoritos de eventos
      const favoritos = await apiRequest("/api/favoritos-eventos");
      if (favoritos.length === 0) {
        container.innerHTML =
          '<p class="text-[#94A3B8] text-center py-8">Nenhum evento favoritado.</p>';
        return;
      }
      container.innerHTML = favoritos
        .map(
          (fav) => `
        <div class="bg-[#1E293B] rounded-xl p-3 flex justify-between items-center cursor-pointer" data-id="${fav.evento.id}">
          <div>
            <h3 class="text-white font-bold">${fav.evento.nome}</h3>
            <p class="text-[#94A3B8] text-sm">${new Date(fav.evento.dataHora).toLocaleString()}</p>
            <p class="text-xs text-[#22C55E]">${fav.evento.estabelecimento?.usuario?.nome || "Estabelecimento"}</p>
          </div>
          <button class="removeFavEventoBtn text-red-400 hover:text-red-600" data-id="${fav.id}">
            <i class="fas fa-heart"></i>
          </button>
        </div>
      `,
        )
        .join("");
      document.querySelectorAll(".removeFavEventoBtn").forEach((btn) => {
        btn.addEventListener("click", async () => {
          const favId = btn.dataset.id;
          await apiRequest(`/api/favoritos-eventos/${favId}`, "DELETE");
          showToast("Removido dos favoritos");
          carregarFavoritos();
        });
      });

      // ADICIONAR EVENTO DE CLIQUE NOS CARDS PARA ABRIR MODAL
      document
        .querySelectorAll("#conteudo-dinamico .cursor-pointer[data-id]")
        .forEach((card) => {
          card.addEventListener("click", (e) => {
            // Não abrir modal se clicar no botão de remover
            if (e.target.closest(".removeFavEventoBtn")) return;
            const eventoId = card.dataset.id;
            if (eventoId && typeof abrirModalDetalhesEvento === "function") {
              abrirModalDetalhesEvento(eventoId);
            }
          });
        });
    }
  } catch (err) {
    console.error("Erro ao carregar favoritos:", err);
    container.innerHTML =
      '<p class="text-red-400 text-center">Erro ao carregar favoritos.</p>';
  }
}

// Configurar abas via event delegation (funciona mesmo se o DOM ainda não tiver carregado)
document.addEventListener("click", (e) => {
  const tabEstab = document.getElementById("tabEstabelecimentos");
  const tabEventos = document.getElementById("tabEventos");
  if (!tabEstab || !tabEventos) return;

  if (e.target === tabEstab || tabEstab.contains(e.target)) {
    abaAtual = "estabelecimentos";
    tabEstab.classList.remove("text-[#94A3B8]", "border-transparent");
    tabEstab.classList.add("text-[#22C55E]", "border-[#22C55E]");
    tabEventos.classList.remove("text-[#22C55E]", "border-[#22C55E]");
    tabEventos.classList.add("text-[#94A3B8]", "border-transparent");
    carregarFavoritos();
  } else if (e.target === tabEventos || tabEventos.contains(e.target)) {
    abaAtual = "eventos";
    tabEventos.classList.remove("text-[#94A3B8]", "border-transparent");
    tabEventos.classList.add("text-[#22C55E]", "border-[#22C55E]");
    tabEstab.classList.remove("text-[#22C55E]", "border-[#22C55E]");
    tabEstab.classList.add("text-[#94A3B8]", "border-transparent");
    carregarFavoritos();
  }
});

// Carregar favoritos inicialmente (já com a aba estabelecimentos)
carregarFavoritos();
