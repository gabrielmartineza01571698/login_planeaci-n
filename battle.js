const POKEAPI_BATTLE_BASE = "https://pokeapi.co/api/v2";

let battlePokemonList = null;

const battleState = {
    p1: null,
    p2: null,
    currentTurn: 1,
    moveNumber: 0,
    battleRunning: false
};

// utilidades rápidas
function battleCapitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function battleNormalize(text) {
    return (text || "").trim().toLowerCase();
}

function battleShowMsg(text, isError = false) {
    const msg = document.getElementById("battleMsg");
    if (!msg) return;

    msg.className = isError ? "msg error" : "msg";
    msg.textContent = text || "";
}

function getArtwork(data) {
    return (
        data?.sprites?.other?.["official-artwork"]?.front_default ||
        data?.sprites?.front_default ||
        ""
    );
}

// lista general para autocompletar
async function fetchBattlePokemonList() {
    if (battlePokemonList) return battlePokemonList;

    const res = await fetch(`${POKEAPI_BATTLE_BASE}/pokemon?limit=1302&offset=0`);
    if (!res.ok) throw new Error("Error cargando lista");

    const data = await res.json();
    battlePokemonList = data.results || [];

    return battlePokemonList;
}

// detalle de pokemon
async function fetchPokemonForBattle(nameOrId) {
    const value = battleNormalize(nameOrId);

    const res = await fetch(`${POKEAPI_BATTLE_BASE}/pokemon/${encodeURIComponent(value)}`);
    if (!res.ok) throw new Error("Pokémon no encontrado");

    const data = await res.json();

    return {
        id: data.id,
        name: data.name,
        sprite: getArtwork(data),
        types: (data.types || []).map(t => t.type?.name).filter(Boolean)
    };
}

// llena el datalist
async function fillPokemonDatalist() {
    const datalist = document.getElementById("pokemonList");
    if (!datalist) return;

    try {
        const list = await fetchBattlePokemonList();
        datalist.innerHTML = "";

        list.forEach(pokemon => {
            const option = document.createElement("option");
            option.value = pokemon.name;
            datalist.appendChild(option);
        });
    } catch (error) {
        battleShowMsg("No se pudo cargar la lista de Pokémon.", true);
    }
}

// preview simple
async function previewPokemon(inputId, imgId, nameId, typeId, boxId) {
    const input = document.getElementById(inputId);
    const img = document.getElementById(imgId);
    const name = document.getElementById(nameId);
    const type = document.getElementById(typeId);
    const box = document.getElementById(boxId);

    if (!input || !img || !name || !type || !box) return;

    const value = battleNormalize(input.value);
    if (!value) {
        battleShowMsg("Escribe un Pokémon.", true);
        return;
    }

    battleShowMsg("Cargando...", false);

    try {
        const pokemon = await fetchPokemonForBattle(value);

        img.src = pokemon.sprite;
        img.style.display = pokemon.sprite ? "block" : "none";

        name.textContent = `#${pokemon.id} - ${battleCapitalize(pokemon.name)}`;
        type.textContent = `Tipo(s): ${pokemon.types.map(battleCapitalize).join(", ") || "N/A"}`;

        box.classList.add("show");
        battleShowMsg("", false);
    } catch (error) {
        battleShowMsg("No se pudo cargar ese Pokémon.", true);
    }
}

// prepara datos de batalla
function buildBattlePokemon(pokemon) {
    return {
        id: pokemon.id,
        name: battleCapitalize(pokemon.name),
        sprite: pokemon.sprite,
        hp: 100,
        turnsPlayed: 0,
        defending: false,
        specialDefending: false
    };
}

// cambia pantallas
function setScreen(screenId) {
    const screens = document.querySelectorAll(".battle-screen");
    screens.forEach(screen => screen.classList.remove("active"));

    const activeScreen = document.getElementById(screenId);
    if (activeScreen) activeScreen.classList.add("active");
}

// actualiza textos de arriba
function updateTurnText(name) {
    const turnText = document.getElementById("turnText");
    if (turnText) {
        turnText.textContent = name ? `Turno de ${name}` : "Preparando...";
    }
}

function updateNarrator(text) {
    const narrator = document.getElementById("narratorText");
    if (narrator) narrator.textContent = text;

    const battleLog = document.getElementById("battleLog");
    if (battleLog) {
        const li = document.createElement("li");
        li.textContent = text;
        battleLog.prepend(li);
    }
}

// refresca la parte visual
function updateBattleUI() {
    if (!battleState.p1 || !battleState.p2) return;

    document.getElementById("p1Name").textContent = battleState.p1.name;
    document.getElementById("p2Name").textContent = battleState.p2.name;

    document.getElementById("p1Img").src = battleState.p1.sprite;
    document.getElementById("p2Img").src = battleState.p2.sprite;

    document.getElementById("p1HpText").textContent = battleState.p1.hp;
    document.getElementById("p2HpText").textContent = battleState.p2.hp;

    document.getElementById("p1HpBar").style.width = `${battleState.p1.hp}%`;
    document.getElementById("p2HpBar").style.width = `${battleState.p2.hp}%`;
}

// pequeño efecto
function animateHit(imgId) {
    const img = document.getElementById(imgId);
    if (!img) return;

    img.classList.add("shake");
    setTimeout(() => {
        img.classList.remove("shake");
    }, 600);
}

// probabilidad de fallo
function tryFail(chance = 0.2) {
    return Math.random() < chance;
}

// acciones permitidas según turnos
function getAvailableActions(pokemon) {
    const actions = ["attack", "defense"];

    if (pokemon.turnsPlayed >= 3) {
        actions.push("specialAttack");
    }

    if (pokemon.turnsPlayed >= 2) {
        actions.push("specialDefense");
    }

    return actions;
}

// elige acción al azar
function chooseRandomAction(actions) {
    const index = Math.floor(Math.random() * actions.length);
    return actions[index];
}

// aplica acción
function applyAction(attacker, defender, action) {
    let damage = 0;
    let actionText = "";
    let targetImgId = battleState.currentTurn === 1 ? "p2Img" : "p1Img";

    // limpia defensa del atacante antes de su nueva acción
    attacker.defending = false;
    attacker.specialDefending = false;

    if (action === "attack") {
        actionText = "usó ataque normal";
        damage = Math.floor(Math.random() * 16) + 10; // 10 a 25
    }

    if (action === "specialAttack") {
        actionText = "usó ataque especial";
        damage = Math.floor(Math.random() * 21) + 20; // 20 a 40
    }

    if (action === "defense") {
        actionText = "usó defensa";
        attacker.defending = true;
    }

    if (action === "specialDefense") {
        actionText = "usó defensa especial";
        attacker.specialDefending = true;
    }

    if (damage > 0) {
        if (defender.specialDefending) {
            damage = 0;
            actionText += ", pero el rival bloqueó todo con defensa especial";
        } else if (defender.defending) {
            damage = Math.floor(damage / 2);
            actionText += ", pero el rival redujo el daño con defensa";
        }

        defender.hp -= damage;
        if (defender.hp < 0) defender.hp = 0;

        animateHit(targetImgId);
    }

    return {
        damage,
        actionText
    };
}

// pantalla final
function finishBattle(winner) {
    battleState.battleRunning = false;
    setScreen("winnerScreen");

    document.getElementById("winnerName").textContent = winner.name;
    document.getElementById("winnerImg").src = winner.sprite;
}

// un turno por vez
function simulateTurn() {
    if (!battleState.battleRunning) return;
    if (battleState.p1.hp <= 0 || battleState.p2.hp <= 0) return;

    const attacker = battleState.currentTurn === 1 ? battleState.p1 : battleState.p2;
    const defender = battleState.currentTurn === 1 ? battleState.p2 : battleState.p1;

    battleState.moveNumber += 1;
    updateTurnText(attacker.name);

    const actions = getAvailableActions(attacker);
    const selectedAction = chooseRandomAction(actions);

    const failed = tryFail(0.2);

    if (failed) {
        let failedActionText = "";

        if (selectedAction === "attack") failedActionText = "ataque normal";
        if (selectedAction === "specialAttack") failedActionText = "ataque especial";
        if (selectedAction === "defense") failedActionText = "defensa";
        if (selectedAction === "specialDefense") failedActionText = "defensa especial";

        updateNarrator(
            `Turno ${battleState.moveNumber}: ${attacker.name} intentó ${failedActionText}, pero falló. ${defender.name} sigue con ${defender.hp}% de vida.`
        );
    } else {
        const result = applyAction(attacker, defender, selectedAction);

        updateNarrator(
            `Turno ${battleState.moveNumber}: ${attacker.name} ${result.actionText}. Hizo ${result.damage}% de daño. ${defender.name} quedó con ${defender.hp}% de vida.`
        );
    }

    attacker.turnsPlayed += 1;
    updateBattleUI();

    if (defender.hp <= 0) {
        setTimeout(() => {
            finishBattle(attacker);
        }, 1200);
        return;
    }

    battleState.currentTurn = battleState.currentTurn === 1 ? 2 : 1;

    setTimeout(() => {
        simulateTurn();
    }, 1800);
}

// inicia la pelea
async function startBattle() {
    const input1 = document.getElementById("poke1Input");
    const input2 = document.getElementById("poke2Input");

    const value1 = battleNormalize(input1?.value);
    const value2 = battleNormalize(input2?.value);

    if (!value1 || !value2) {
        battleShowMsg("Debes elegir dos Pokémon.", true);
        return;
    }

    if (value1 === value2) {
        battleShowMsg("Debes elegir Pokémon distintos.", true);
        return;
    }

    battleShowMsg("Preparando batalla...", false);

    try {
        const pokemon1 = await fetchPokemonForBattle(value1);
        const pokemon2 = await fetchPokemonForBattle(value2);

        battleState.p1 = buildBattlePokemon(pokemon1);
        battleState.p2 = buildBattlePokemon(pokemon2);
        battleState.currentTurn = 1;
        battleState.moveNumber = 0;
        battleState.battleRunning = true;

        const battleLog = document.getElementById("battleLog");
        if (battleLog) battleLog.innerHTML = "";

        updateBattleUI();
        updateTurnText(battleState.p1.name);
        updateNarrator(`¡Comienza la batalla entre ${battleState.p1.name} y ${battleState.p2.name}!`);

        setScreen("battleScreen");
        battleShowMsg("", false);

        setTimeout(() => {
            simulateTurn();
        }, 1500);
    } catch (error) {
        battleShowMsg("No se pudo iniciar la batalla.", true);
    }
}

// regresa al inicio
function restartBattle() {
    battleState.p1 = null;
    battleState.p2 = null;
    battleState.currentTurn = 1;
    battleState.moveNumber = 0;
    battleState.battleRunning = false;

    document.getElementById("poke1Input").value = "";
    document.getElementById("poke2Input").value = "";

    document.getElementById("previewBox1").classList.remove("show");
    document.getElementById("previewBox2").classList.remove("show");

    document.getElementById("previewImg1").style.display = "none";
    document.getElementById("previewImg2").style.display = "none";

    document.getElementById("previewName1").textContent = "";
    document.getElementById("previewName2").textContent = "";
    document.getElementById("previewType1").textContent = "";
    document.getElementById("previewType2").textContent = "";

    const battleLog = document.getElementById("battleLog");
    if (battleLog) battleLog.innerHTML = "";

    battleShowMsg("", false);
    setScreen("selectionScreen");
}

// enlaza eventos de esta vista
function initBattleUI() {
    const screen = document.getElementById("selectionScreen");
    if (!screen) return;

    fillPokemonDatalist();

    document.getElementById("btnPreview1")?.addEventListener("click", () => {
        previewPokemon("poke1Input", "previewImg1", "previewName1", "previewType1", "previewBox1");
    });

    document.getElementById("btnPreview2")?.addEventListener("click", () => {
        previewPokemon("poke2Input", "previewImg2", "previewName2", "previewType2", "previewBox2");
    });

    document.getElementById("btnStartBattle")?.addEventListener("click", startBattle);
    document.getElementById("btnRestartBattle")?.addEventListener("click", restartBattle);
}

document.addEventListener("DOMContentLoaded", initBattleUI);