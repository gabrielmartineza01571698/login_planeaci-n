async function loadPartials() {
    const headerBox = document.getElementById("header");
    const footerBox = document.getElementById("footer");

    if (headerBox) {
        const resH = await fetch("header.html");
        headerBox.innerHTML = await resH.text();
    }

    if (footerBox) {
        const resF = await fetch("footer.html");
        footerBox.innerHTML = await resF.text();
    }

    const btn = document.getElementById("btnLogout");
    if (btn) {
        btn.addEventListener("click", () => {
            sessionStorage.removeItem("loggedUser");
            window.location.href = "login.html";
        });
    }

    loadRandomPokemon();

    const btnOtro = document.getElementById("btnOtro");
    if (btnOtro) {
        btnOtro.addEventListener("click", loadRandomPokemon);
    }
}

// bloqueo
function requireLogin() {
    const user = sessionStorage.getItem("loggedUser");
    if (!user) {
        window.location.href = "login.html";
    }
}

function redirectIfLogged() {
    const user = sessionStorage.getItem("loggedUser");
    if (user) {
        window.location.href = "pag1.html";
    }
}

function capitalize(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
}

async function loadRandomPokemon() {
    const nameEl = document.getElementById("pokeName");
    const imgEl  = document.getElementById("pokeImg");
    const msgEl  = document.getElementById("pokeMsg");

    if (!nameEl || !imgEl || !msgEl) return;

    msgEl.className = "msg";
    msgEl.textContent = "Cargando Pokémon...";
    nameEl.textContent = "";
    imgEl.style.display = "none";

    try {
        const id = Math.floor(Math.random() * 1010) + 1;

        const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
        if (!res.ok) throw new Error("No se pudo cargar el Pokémon");

        const data = await res.json();

        const nombre = capitalize(data.name);

        const img =
            data?.sprites?.other?.["official-artwork"]?.front_default ||
            data?.sprites?.front_default;

        nameEl.textContent = nombre;

        if (img) {
            imgEl.src = img;
            imgEl.style.display = "block";
        }

        msgEl.textContent = "";
    } catch (err) {
        msgEl.className = "msg error";
        msgEl.textContent = "Error cargando Pokémon.";
    }
}

document.addEventListener("DOMContentLoaded", loadPartials);