// app.js

async function loadPartials() {
    const headerBox = document.getElementById("header");
    const footerBox = document.getElementById("footer");

    // carga header
    if (headerBox) {
        const resH = await fetch("header.html");
        headerBox.innerHTML = await resH.text();
    }

    // carga footer
    if (footerBox) {
        const resF = await fetch("footer.html");
        footerBox.innerHTML = await resF.text();
    }

    // logout del header (si existe)
    const btn = document.getElementById("btnLogout");
    if (btn) {
        btn.addEventListener("click", () => {
            sessionStorage.removeItem("loggedUser");
            window.location.href = "login.html";
        });
    }

    // inicia la UI de la pokedex
    initPokedexUI();
}

// bloquea si no hay login
function requireLogin() {
    const user = sessionStorage.getItem("loggedUser");
    if (!user) {
        window.location.href = "login.html";
    }
}

// si ya está logueado lo manda a pag1
function redirectIfLogged() {
    const user = sessionStorage.getItem("loggedUser");
    if (user) {
        window.location.href = "pag1.html";
    }
}

const POKEAPI_BASE = "https://pokeapi.co/api/v2";
let allPokemonList = null;

// estado de paginación
let currentResults = [];
let currentPage = 1;
const PAGE_SIZE = 20;

function capitalize(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalize(s) {
    return (s || "").trim().toLowerCase();
}

// lista completa (para búsquedas por nombre parcial)
async function fetchAllPokemonList() {
    if (allPokemonList) return allPokemonList;

    const res = await fetch(`${POKEAPI_BASE}/pokemon?limit=1302&offset=0`);
    if (!res.ok) throw new Error("Error");
    const data = await res.json();

    allPokemonList = data.results || [];
    return allPokemonList;
}

// mensaje de estado
function showMsg(el, text, isError = false) {
    if (!el) return;
    el.className = isError ? "msg error" : "msg";
    el.textContent = text || "";
}

function hide(el) {
    if (el) el.style.display = "none";
}

function show(el) {
    if (!el) return;

    //flex para que la lista use el espacio y haya scroll
    if (el.id === "resultsBox" || el.id === "pagerBox") {
        el.style.display = "flex";
        return;
    }

    el.style.display = "block";
}

// muestra detalle en pantalla
function setDetail({ id, name, sprite, types }) {
    const detailBox = document.getElementById("detailBox");
    const detailImg = document.getElementById("detailImg");
    const detailName = document.getElementById("detailName");
    const detailInfo = document.getElementById("detailInfo");

    if (!detailBox || !detailImg || !detailName || !detailInfo) return;

    show(detailBox);

    detailName.textContent = `#${id} - ${capitalize(name)}`;

    const typeText = (types || []).map(t => capitalize(t)).join(", ");
    detailInfo.textContent = `Tipo(s): ${typeText || "N/A"}`;

    if (sprite) {
        detailImg.src = sprite;
        detailImg.style.display = "block";
    } else {
        detailImg.style.display = "none";
    }
}

// limpia resultados y detalle
function clearUI() {
    hide(document.getElementById("detailBox"));
    hide(document.getElementById("resultsBox"));
    hide(document.getElementById("pagerBox"));

    const resultsList = document.getElementById("resultsList");
    if (resultsList) resultsList.innerHTML = "";

    // resetea paginación
    currentResults = [];
    currentPage = 1;
}

// trae detalle por nombre o id
async function getPokemonByNameOrId(value) {
    const v = normalize(value);
    const res = await fetch(`${POKEAPI_BASE}/pokemon/${encodeURIComponent(v)}`);
    if (!res.ok) throw new Error("No encontrado");
    const data = await res.json();

    const sprite =
        data?.sprites?.other?.["official-artwork"]?.front_default ||
        data?.sprites?.front_default;

    const types = (data.types || []).map(x => x.type?.name).filter(Boolean);

    return {
        id: data.id,
        name: data.name,
        sprite,
        types
    };
}

// trae lista de pokemon por tipo
async function getPokemonListByType(typeName) {
    const t = normalize(typeName);
    const res = await fetch(`${POKEAPI_BASE}/type/${encodeURIComponent(t)}`);
    if (!res.ok) throw new Error("Tipo no encontrado");
    const data = await res.json();

    return (data.pokemon || [])
        .map(x => x.pokemon)
        .filter(Boolean);
}

// pinta resultados (paginado)
function renderResultsList(items) {
    const resultsBox = document.getElementById("resultsBox");
    const resultsList = document.getElementById("resultsList");

    const pagerBox = document.getElementById("pagerBox");
    const pagerInfo = document.getElementById("pagerInfo");
    const btnPrev = document.getElementById("btnPrev");
    const btnNext = document.getElementById("btnNext");

    if (!resultsBox || !resultsList) return;

    currentResults = Array.isArray(items) ? items : [];
    if (currentPage < 1) currentPage = 1;

    const total = currentResults.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const pageItems = currentResults.slice(start, end);

    resultsList.innerHTML = "";

    pageItems.forEach(p => {
        const row = document.createElement("div");
        row.style.border = "1px solid #ddd";
        row.style.borderRadius = "6px";
        row.style.padding = "8px";
        row.style.display = "flex";
        row.style.justifyContent = "space-between";
        row.style.alignItems = "center";
        row.style.gap = "10px";

        const left = document.createElement("div");
        left.textContent = capitalize(p.name);

        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = "Ver";
        btn.style.width = "90px";

        // click para ver detalle
        btn.addEventListener("click", async () => {
            const msgEl = document.getElementById("searchMsg");
            showMsg(msgEl, "Cargando...", false);

            try {
                const detail = await getPokemonByNameOrId(p.name);

                // oculta lista y muestra detalle
                hide(document.getElementById("resultsBox"));
                hide(document.getElementById("pagerBox"));

                setDetail(detail);
                showMsg(msgEl, "", false);
            } catch (e) {
                showMsg(msgEl, "Error cargando detalles.", true);
            }
        });

        row.appendChild(left);
        row.appendChild(btn);
        resultsList.appendChild(row);
    });

    show(resultsBox);

    // controles de paginado
    if (pagerBox && pagerInfo && btnPrev && btnNext) {
        show(pagerBox);

        pagerInfo.textContent = `Página ${currentPage} de ${totalPages} (${total} resultados)`;

        btnPrev.disabled = currentPage <= 1;
        btnNext.disabled = currentPage >= totalPages;

        btnPrev.onclick = () => {
            currentPage--;
            renderResultsList(currentResults);
        };

        btnNext.onclick = () => {
            currentPage++;
            renderResultsList(currentResults);
        };
    }
}

// ejecuta búsqueda según modo
async function searchPokemon() {
    const modeEl = document.getElementById("searchMode");
    const inputEl = document.getElementById("searchInput");
    const msgEl = document.getElementById("searchMsg");

    if (!modeEl || !inputEl || !msgEl) return;

    const mode = modeEl.value;
    const qRaw = inputEl.value;
    const q = normalize(qRaw);

    clearUI();
    currentPage = 1;

    if (!q) {
        showMsg(msgEl, "Escribe algo para buscar.", true);
        return;
    }

    showMsg(msgEl, "Buscando...", false);

    try {
        // por id o nombre exacto
        if (mode === "id" || mode === "name") {
            const detail = await getPokemonByNameOrId(q);
            setDetail(detail);
            showMsg(msgEl, "", false);
            return;
        }

        // por tipo (lista)
        if (mode === "type") {
            const list = await getPokemonListByType(q);
            if (!list.length) {
                showMsg(msgEl, "No hay resultados.", true);
                return;
            }
            renderResultsList(list);
            showMsg(msgEl, `Resultados: ${list.length}`, false);
            return;
        }

    } catch (e) {
        // si no encontró por nombre exacto, hace parcial
        if (mode === "name") {
            try {
                const list = await fetchAllPokemonList();
                const matches = list.filter(p => p.name.includes(q)); // sin límite para paginar

                if (matches.length) {
                    renderResultsList(matches);
                    showMsg(msgEl, "No exacto, pero mira estos.", true);
                    return;
                }
            } catch (_) {}
        }

        showMsg(msgEl, "No encontrado.", true);
    }
}

// engancha eventos de la UI
async function initPokedexUI() {
    const btnBuscar = document.getElementById("btnBuscar");
    const inputEl = document.getElementById("searchInput");
    const modeEl = document.getElementById("searchMode");
    const msgEl = document.getElementById("searchMsg");

    if (!btnBuscar || !inputEl || !modeEl || !msgEl) return;

    // precarga lista completa
    fetchAllPokemonList().catch(() => {});

    // click buscar
    btnBuscar.addEventListener("click", searchPokemon);

    // enter buscar
    inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            searchPokemon();
        }
    });

    // cambia placeholders
    modeEl.addEventListener("change", () => {
        clearUI();
        showMsg(msgEl, "", false);

        const mode = modeEl.value;
        if (mode === "name") inputEl.placeholder = "ej: pikachu";
        if (mode === "id") inputEl.placeholder = "ej: 25";
        if (mode === "type") inputEl.placeholder = "ej: fire, water, electric";
    });
}

document.addEventListener("DOMContentLoaded", loadPartials);
