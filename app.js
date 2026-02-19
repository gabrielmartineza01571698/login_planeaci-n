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
}
//bloqueo
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

document.addEventListener("DOMContentLoaded", loadPartials);