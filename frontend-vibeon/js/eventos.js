// js/eventos.js

// Carrega eventos de um estabelecimento específico (opcional)
async function carregarEventosEstabelecimento(estabelecimentoId, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    const eventos = await apiRequest(
      `/api/eventos?estabelecimentoId=${estabelecimentoId}`,
    );
    if (eventos.length === 0) {
      container.innerHTML =
        '<p class="text-[#94A3B8]">Nenhum evento cadastrado ainda.</p>';
      return;
    }
    container.innerHTML = eventos
      .map(
        (ev) => `
      <div class="bg-[#1E293B] rounded-xl p-3 mb-2">
        <div class="flex justify-between items-start">
          <div>
            <h3 class="text-white font-bold">${ev.nome}</h3>
            <p class="text-[#94A3B8] text-sm">${new Date(ev.dataHora).toLocaleString()}</p>
            ${ev.preco ? `<p class="text-[#22C55E] text-xs">R$ ${ev.preco}</p>` : ""}
            <p class="text-xs text-[#94A3B8]">${ev.descricao || ""}</p>
          </div>
        </div>
      </div>
    `,
      )
      .join("");
  } catch (err) {
    container.innerHTML =
      '<p class="text-red-400">Erro ao carregar eventos.</p>';
  }
}

// Abre modal de criação de evento
function abrirModalCriarEvento(estabelecimentoId) {
  const modal = document.getElementById("modalCriarEvento");
  if (!modal) {
    criarModalCriarEvento();
  }
  document.getElementById("modalCriarEvento").classList.remove("hidden");
  document.getElementById("modalCriarEvento").classList.add("flex");
  // Guarda o estabelecimentoId no formulário
  document.getElementById("eventoEstabelecimentoId").value = estabelecimentoId;
}

function criarModalCriarEvento() {
  const modalExistente = document.getElementById("modalCriarEvento");
  if (modalExistente) modalExistente.remove();

  const floatingContainer = document.getElementById("floating-elements");
  if (!floatingContainer) return;

  const modalDiv = document.createElement("div");
  modalDiv.id = "modalCriarEvento";
  modalDiv.className =
    "absolute inset-0 flex items-center justify-center pointer-events-auto";
  modalDiv.style.backgroundColor = "rgba(0,0,0,0.8)";
  modalDiv.style.zIndex = "30";

  modalDiv.innerHTML = `
    <div class="bg-[#0F172A] rounded-2xl w-[90%] max-w-[350px] max-h-[85vh] overflow-y-auto border border-[#7C3AED] p-5 shadow-xl">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-white text-xl font-bold">Criar Evento</h3>
        <button id="fecharModalEvento" class="text-[#94A3B8] hover:text-white text-2xl">&times;</button>
      </div>
      <input type="hidden" id="eventoEstabelecimentoId">
      <div class="space-y-3">
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Nome do evento</label>
          <input type="text" id="eventoNome" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
        </div>
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Descrição</label>
          <textarea id="eventoDescricao" rows="2" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg"></textarea>
        </div>
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Data e Hora</label>
          <input type="datetime-local" id="eventoDataHora" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
        </div>
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Preço (opcional)</label>
          <input type="text" id="eventoPreco" placeholder="R$ 0,00" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
        </div>
        <div>
          <label class="text-[#CBD5E1] text-sm block mb-1">Foto do evento (opcional)</label>
          <input type="file" id="eventoFoto" accept="image/jpeg,image/png,image/jpg,image/webp" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
        </div>
        <button id="salvarEventoBtn" class="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-2 rounded-full mt-2">Salvar Evento</button>
      </div>
    </div>
  `;

  floatingContainer.appendChild(modalDiv);

  const fechar = document.getElementById("fecharModalEvento");
  const salvar = document.getElementById("salvarEventoBtn");
  const modal = modalDiv;

  fechar.onclick = () => modal.remove();
  modal.onclick = (e) => {
    if (e.target === modal) modal.remove();
  };

  salvar.onclick = async () => {
    const estabelecimentoId = document.getElementById(
      "eventoEstabelecimentoId",
    ).value;
    const nome = document.getElementById("eventoNome").value;
    const descricao = document.getElementById("eventoDescricao").value;
    const dataHora = document.getElementById("eventoDataHora").value;
    const preco = document.getElementById("eventoPreco").value;
    const fotoFile = document.getElementById("eventoFoto").files[0]; // ← pega o arquivo

    if (!nome || !dataHora) {
      showToast("Nome e data/hora são obrigatórios");
      return;
    }

    const formData = new FormData();
    formData.append("nome", nome);
    formData.append("descricao", descricao);
    formData.append("dataHora", dataHora);
    formData.append("preco", preco);
    if (fotoFile) formData.append("foto", fotoFile);

    try {
      const response = await fetch(`${API_URL}/api/eventos`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          // NÃO coloque Content-Type – o browser define automaticamente
        },
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.erro || "Erro ao criar evento");
      showToast("Evento criado com sucesso!");
      modal.remove();
      if (typeof carregarAgenda === "function") carregarAgenda();
      if (typeof carregarPerfil === "function") carregarPerfil();
    } catch (err) {
      showToast(err.message);
    }
  };
}

async function abrirModalEditarEvento(eventoId) {
  try {
    const evento = await apiRequest(`/api/eventos/${eventoId}`);

    const modalDiv = document.createElement("div");
    modalDiv.id = "modalEditarEvento";
    modalDiv.className =
      "absolute inset-0 flex items-center justify-center pointer-events-auto";
    modalDiv.style.backgroundColor = "rgba(0,0,0,0.8)";
    modalDiv.style.zIndex = "30";

    modalDiv.innerHTML = `
      <div class="bg-[#0F172A] rounded-2xl w-[90%] max-w-[350px] max-h-[85vh] overflow-y-auto border border-[#7C3AED] p-5 shadow-xl">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-white text-xl font-bold">Editar Evento</h3>
          <button id="fecharModalEditar" class="text-[#94A3B8] hover:text-white text-2xl">&times;</button>
        </div>
        <div class="space-y-3">
          <div>
            <label class="text-[#CBD5E1] text-sm block mb-1">Nome do evento</label>
            <input type="text" id="editEventoNome" value="${evento.nome.replace(/"/g, "&quot;")}" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
          </div>
          <div>
            <label class="text-[#CBD5E1] text-sm block mb-1">Descrição</label>
            <textarea id="editEventoDescricao" rows="2" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">${evento.descricao || ""}</textarea>
          </div>
          <div>
            <label class="text-[#CBD5E1] text-sm block mb-1">Data e Hora</label>
            <input type="datetime-local" id="editEventoDataHora" value="${new Date(evento.dataHora).toISOString().slice(0, 16)}" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
          </div>
          <div>
            <label class="text-[#CBD5E1] text-sm block mb-1">Preço (opcional)</label>
            <input type="text" id="editEventoPreco" value="${evento.preco || ""}" placeholder="R$ 0,00" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
          </div>
          <div>
            <label class="text-[#CBD5E1] text-sm block mb-1">Nova foto (opcional)</label>
            <input type="file" id="editEventoFoto" accept="image/jpeg,image/png,image/jpg,image/webp" class="w-full bg-[#1E293B] border border-[#334155] text-white p-2 rounded-lg">
          </div>
          <button id="salvarEdicaoEvento" class="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white py-2 rounded-full mt-2">Salvar Alterações</button>
        </div>
      </div>
    `;

    const floatingContainer = document.getElementById("floating-elements");
    floatingContainer.appendChild(modalDiv);

    const fechar = document.getElementById("fecharModalEditar");
    const salvar = document.getElementById("salvarEdicaoEvento");
    const modal = modalDiv;

    fechar.onclick = () => modal.remove();
    modal.onclick = (e) => {
      if (e.target === modal) modal.remove();
    };

    salvar.onclick = async () => {
      const nome = document.getElementById("editEventoNome").value;
      const descricao = document.getElementById("editEventoDescricao").value;
      const dataHora = document.getElementById("editEventoDataHora").value;
      const preco = document.getElementById("editEventoPreco").value;
      const fotoFile = document.getElementById("editEventoFoto").files[0];

      if (!nome || !dataHora) {
        showToast("Nome e data/hora são obrigatórios");
        return;
      }

      const formData = new FormData();
      formData.append("nome", nome);
      formData.append("descricao", descricao);
      formData.append("dataHora", dataHora);
      formData.append("preco", preco);
      if (fotoFile) formData.append("foto", fotoFile);

      try {
        const response = await fetch(`${API_URL}/api/eventos/${eventoId}`, {
          method: "PUT",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.erro || "Erro ao editar evento");
        showToast("Evento editado com sucesso!");
        modal.remove();
        if (typeof carregarAgenda === "function") carregarAgenda();
        if (typeof carregarPerfil === "function") carregarPerfil();
      } catch (err) {
        showToast(err.message);
      }
    };
  } catch (err) {
    showToast(err.message);
  }
}
