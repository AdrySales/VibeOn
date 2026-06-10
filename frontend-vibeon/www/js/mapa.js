// js/mapa.js

let mapaGlobal = null;
let marcadores = [];
let filtroMapaAtual = "todos";

function obterFiltroDataMapa(filtro) {
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
  return (evento) => {
    const dataEv = new Date(evento.dataHora);
    if (filtro === "hoje") return dataEv.toDateString() === hoje.toDateString();
    if (filtro === "amanha")
      return dataEv.toDateString() === amanha.toDateString();
    if (filtro === "fim_semana") return dataEv >= sexta && dataEv <= domingo;
    return true; // 'todos'
  };
}

async function carregarMapa() {
  const container = document.getElementById("mapaContainer");
  if (!container) return;

  // Inicializar mapa (centro provisório – depois centraliza na localização)
  mapaGlobal = L.map("mapaContainer").setView([-8.0476, -34.877], 13);
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> & CartoDB',
      subdomains: "abcd",
      maxZoom: 19,
    },
  ).addTo(mapaGlobal);

  // Carregar eventos e geolocalizar
  await atualizarMapa();

  // Configurar filtros de data no mapa
  document.querySelectorAll(".map-filter-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      document.querySelectorAll(".map-filter-btn").forEach((b) => {
        b.classList.remove("bg-[#7C3AED]", "text-white");
        b.classList.add("bg-transparent", "text-[#94A3B8]");
      });
      btn.classList.remove("bg-transparent", "text-[#94A3B8]");
      btn.classList.add("bg-[#7C3AED]", "text-white");
      filtroMapaAtual = btn.dataset.filter;
      await atualizarMapa();
    });
  });
}

async function atualizarMapa() {
  try {
    // Buscar todos os eventos
    const eventos = await apiRequest("/api/eventos");
    // Filtrar por data
    const filtroData = obterFiltroDataMapa(filtroMapaAtual);
    const eventosFiltrados = eventos.filter(filtroData);
    document.getElementById("mapaInfo").innerHTML =
      `📍 ${eventosFiltrados.length} evento(s) encontrado(s)`;

    // Remover marcadores antigos
    marcadores.forEach((m) => mapaGlobal.removeLayer(m));
    marcadores = [];

    // Adicionar pins no mapa (apenas eventos com endereço)
    for (const evento of eventosFiltrados) {
      const endereco = evento.estabelecimento?.endereco;
      if (!endereco) continue;
      try {
        // Geocodificação via Nominatim (gratuita, mas com limite de 1 req/s)
        // Para melhor performance, poderíamos geocodificar em lote no backend, mas assim já funciona.
        const coords = await geocodeEndereco(endereco);
        if (coords) {
          const popupContent = `
            <div style="min-width: 180px;">
              <strong>${evento.nome}</strong><br>
              ${evento.estabelecimento?.usuario?.nome}<br>
              ${new Date(evento.dataHora).toLocaleString()}<br>
              <a href="#" onclick="abrirModalDetalhesEvento(${evento.id}); return false;" style="color: #7C3AED;">Ver detalhes →</a>
            </div>
          `;
          const marker = L.marker([coords.lat, coords.lon]).addTo(mapaGlobal);
          marker.bindPopup(popupContent);
          marcadores.push(marker);
        }
      } catch (err) {
        console.warn(`Erro ao geocodificar ${endereco}:`, err);
      }
    }

    // Centralizar na localização do usuário (se permitir)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const userLat = pos.coords.latitude;
          const userLng = pos.coords.longitude;
          mapaGlobal.setView([userLat, userLng], 13);
        },
        () => {
          // Fallback: centro de Recife
          mapaGlobal.setView([-8.0476, -34.877], 13);
        },
      );
    } else {
      mapaGlobal.setView([-8.0476, -34.877], 13);
    }
  } catch (err) {
    console.error(err);
    document.getElementById("mapaInfo").innerHTML =
      "❌ Erro ao carregar eventos no mapa.";
  }
}

// Função de geocodificação usando Nominatim (OpenStreetMap)
async function geocodeEndereco(endereco) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}&limit=1`;
  const response = await fetch(url, {
    headers: { "User-Agent": "VibeOnApp/1.0" }, // obrigatório por política do Nominatim
  });
  const data = await response.json();
  if (data && data.length > 0) {
    return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
  }
  return null;
}

// Inicializar o mapa quando a página for carregada (a função já é chamada pelo main.js)
if (typeof carregarMapa === "function") {
  // Aguardar DOM e depois chamar (já será chamada pelo main.js)
}
