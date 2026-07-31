// ==========================
// API BACKEND
// ==========================
const API = "http://localhost:3000"

// ==========================
// IMAGEM BASE64
// ==========================
function lerImagem(file){
    return new Promise((resolve)=>{
        if(!file){
            resolve(null)
            return
        }

        const reader = new FileReader()

        reader.onload = function(e){
            resolve(e.target.result)
        }

        reader.onerror = function(){
            resolve(null)
        }

        reader.readAsDataURL(file)
    })
}

// ==========================
let rpgAtual = null
let personagemAtual = null
let npcAtual = null

// ==========================
// FIX REFERÊNCIA (ESSENCIAL)
// ==========================
function atualizarReferenciaPersonagem(){
    personagemAtual = rpgAtual.personagens.find(p => p.id === personagemAtual.id)
}

function atualizarReferenciaNPC(){
    npcAtual = rpgAtual.npcs.find(n => n.id === npcAtual.id)
}

// ==========================
// INIT
// ==========================
document.addEventListener("DOMContentLoaded", ()=>{
    renderRPGs()
})

// ==========================
// BACKEND
// ==========================
async function carregarRPGs(){
    const res = await fetch(API + "/rpgs")
    return await res.json()
}

async function criarRPG(rpg){
    const res = await fetch(API + "/rpgs", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(rpg)
    })
    return await res.json()
}

async function atualizarRPGBackend(rpg){
    await fetch(API + "/rpgs/" + rpg.id, {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(rpg)
    })
}

async function deletarRPG(id){
    await fetch(API + "/rpgs/" + id, {
        method: "DELETE"
    })
}

// ==========================
// CRIAR RPG
// ==========================
formCriarRPG.addEventListener("submit", async (e)=>{
    e.preventDefault()

    const nome = nomeRPG.value.trim()
    if(!nome) return

    const capa = await lerImagem(capaRPG.files[0])

    const novo = {
        nome,
        capa,
        personagens: [],
        npcs: [],
        locais: [],
        sessoes: [],
        resumoGeral: ""  // Novo campo para resumo geral do RPG
    }

    await criarRPG(novo)

    formCriarRPG.reset()
    renderRPGs()
})

// ==========================
// RENDER RPGs
// ==========================
async function renderRPGs(){
    listaRPGs.innerHTML = ""

    const rpgs = await carregarRPGs()

    rpgs.forEach((rpg)=>{
        const card = document.createElement("div")
        card.className = "rpg-card"

        if(rpg.capa){
            const img = document.createElement("img")
            img.src = rpg.capa
            card.appendChild(img)
        }

        const span = document.createElement("span")
        span.textContent = rpg.nome

        const del = document.createElement("button")
        del.textContent = "X"
        del.className = "delete-btn"

        del.onclick = async (e)=>{
            e.stopPropagation()
            if(confirm("Excluir RPG?")){
                await deletarRPG(rpg.id)
                renderRPGs()
            }
        }

        card.onclick = ()=>entrarRPG(rpg.id)

        card.appendChild(span)
        card.appendChild(del)

        listaRPGs.appendChild(card)
    })
}

// ==========================
// ENTRAR RPG
// ==========================
async function entrarRPG(id){
    const rpgs = await carregarRPGs()
    rpgAtual = rpgs.find(r=>r.id===id)

    if(!rpgAtual.locais) rpgAtual.locais = []
    if(!rpgAtual.resumoGeral) rpgAtual.resumoGeral = ""

    menuInicial.style.display = "none"
    sistemaRPG.style.display = "block"

    tituloRPG.textContent = rpgAtual.nome

    if(rpgAtual.capa){
        imgCapaRPG.src = rpgAtual.capa
    }

    renderPersonagens()
    renderNPCs()
    renderLocais()
    renderSessoes()
    renderResumoGeral()
    atualizarBanco()
}

// ==========================
// RESUMO GERAL DO RPG (DASHBOARD)
// ==========================
function renderResumoGeral(){
    const resumoElement = document.getElementById('resumoRPG')
    if(!resumoElement) return
    
    // Criar um container editável
    resumoElement.innerHTML = ''
    
    const textarea = document.createElement('textarea')
    textarea.value = rpgAtual.resumoGeral || ''
    textarea.placeholder = 'Escreva o resumo geral da campanha aqui...'
    textarea.rows = 8
    textarea.style.width = '100%'
    textarea.style.padding = '10px'
    textarea.style.fontFamily = 'inherit'
    textarea.style.resize = 'vertical'
    
    const saveBtn = document.createElement('button')
    saveBtn.textContent = 'Salvar Resumo'
    saveBtn.style.marginTop = '10px'
    saveBtn.onclick = async () => {
        rpgAtual.resumoGeral = textarea.value
        await atualizarRPG()
        renderResumoGeral()
    }
    
    resumoElement.appendChild(textarea)
    resumoElement.appendChild(saveBtn)
}

// ==========================
async function atualizarRPG(){
    await atualizarRPGBackend(rpgAtual)

    const rpgs = await carregarRPGs()
    rpgAtual = rpgs.find(r=>r.id===rpgAtual.id)

    atualizarBanco()
}

// ==========================
// PERSONAGENS
// ==========================
formPersonagem.addEventListener("submit", async (e)=>{
    e.preventDefault()

    const foto = await lerImagem(fotoPersonagem.files[0])

    rpgAtual.personagens.push({
        id: Date.now(),
        nome: nomePersonagem.value,
        classe: classe.value,
        hp: Number(hpPersonagem.value) || 100,
        foto,
        inventario: [],
        missoes: [],
        lore: []
    })

    formPersonagem.reset()
    await atualizarRPG()
    renderPersonagens()
})

function renderPersonagens(){
    listaPersonagens.innerHTML = ""

    rpgAtual.personagens.forEach((p,i)=>{
        if(p.hp === undefined) p.hp = 100

        const div = document.createElement("div")
        div.className = "personagem-item"
        div.innerHTML = `<strong>${p.nome}</strong> (${p.classe}) - HP: ${p.hp}`

        const abrir = document.createElement("button")
        abrir.textContent = "Abrir"

        abrir.onclick = ()=>{
            personagemAtual = p
            abrirPersonagem()
        }

        const del = document.createElement("button")
        del.textContent = "Excluir"

        del.onclick = async ()=>{
            if(confirm(`Excluir ${p.nome}?`)){
                rpgAtual.personagens.splice(i,1)
                await atualizarRPG()
                renderPersonagens()
            }
        }

        div.appendChild(abrir)
        div.appendChild(del)

        listaPersonagens.appendChild(div)
    })
}

// ==========================
// ABRIR PERSONAGEM
// ==========================
function abrirPersonagem(){
    personagemSelecionado.style.display = "block"

    if(personagemAtual.hp === undefined) personagemAtual.hp = 100

    tituloPersonagem.textContent = personagemAtual.nome
    imgPersonagem.src = personagemAtual.foto || ""

    viewHP.textContent = personagemAtual.hp
    editHP.value = personagemAtual.hp

    editHP.onchange = async ()=>{
        personagemAtual.hp = Number(editHP.value)
        await atualizarRPG()
        atualizarReferenciaPersonagem()
        abrirPersonagem()
    }

    viewInventario.innerHTML = personagemAtual.inventario.length
        ? personagemAtual.inventario.map(i=>`<li>${i.nome} x${i.qtd}</li>`).join("")
        : "<li>Sem itens</li>"

    viewMissoes.innerHTML = personagemAtual.missoes.length
        ? personagemAtual.missoes.map(m=>`<li>${m.nome}</li>`).join("")
        : "<li>Nenhuma missão</li>"

    viewLore.innerHTML = personagemAtual.lore.length
        ? personagemAtual.lore.map(l=>`<div><h4>${l.titulo}</h4><p>${l.texto}</p></div>`).join("")
        : "<p>Sem lore</p>"

    renderInventario()
    renderMissoes()
    renderLore()
}

// ==========================
// INVENTÁRIO
// ==========================
formItem.addEventListener("submit", async (e)=>{
    e.preventDefault()

    const foto = await lerImagem(fotoItem.files[0])

    personagemAtual.inventario.push({
        nome: itemNome.value,
        qtd: Number(itemQtd.value) || 1,
        foto
    })

    formItem.reset()
    await atualizarRPG()
    atualizarReferenciaPersonagem()
    abrirPersonagem()
})

function renderInventario(){
    listaInventario.innerHTML = ""

    personagemAtual.inventario.forEach((item,i)=>{
        const li = document.createElement("li")
        li.textContent = `${item.nome} x${item.qtd}`

        const btn = document.createElement("button")
        btn.textContent = "X"

        btn.onclick = async ()=>{
            personagemAtual.inventario.splice(i,1)
            await atualizarRPG()
            atualizarReferenciaPersonagem()
            abrirPersonagem()
        }

        li.appendChild(btn)
        listaInventario.appendChild(li)
    })
}

// ==========================
// MISSÕES
// ==========================
formMissao.addEventListener("submit", async (e)=>{
    e.preventDefault()

    personagemAtual.missoes.push({
        nome: nomeMissao.value,
        concluida: false
    })

    formMissao.reset()
    await atualizarRPG()
    atualizarReferenciaPersonagem()
    abrirPersonagem()
})

function renderMissoes(){
    listaMissoes.innerHTML = ""

    personagemAtual.missoes.forEach((m,i)=>{
        const li = document.createElement("li")
        
        const checkbox = document.createElement('input')
        checkbox.type = 'checkbox'
        checkbox.checked = m.concluida || false
        checkbox.onchange = async () => {
            m.concluida = checkbox.checked
            await atualizarRPG()
            atualizarReferenciaPersonagem()
            renderMissoes()
        }
        
        const text = document.createTextNode(` ${m.nome}`)
        
        const btn = document.createElement("button")
        btn.textContent = "X"

        btn.onclick = async ()=>{
            personagemAtual.missoes.splice(i,1)
            await atualizarRPG()
            atualizarReferenciaPersonagem()
            abrirPersonagem()
        }

        li.appendChild(checkbox)
        li.appendChild(text)
        li.appendChild(btn)
        listaMissoes.appendChild(li)
    })
}

// ==========================
// LORE
// ==========================
formLore.addEventListener("submit", async (e)=>{
    e.preventDefault()

    personagemAtual.lore.push({
        id: Date.now(),
        titulo: tituloLore.value,
        texto: textoLore.value,
        data: new Date().toLocaleDateString()
    })

    formLore.reset()
    await atualizarRPG()
    atualizarReferenciaPersonagem()
    abrirPersonagem()
})

function renderLore(){
    listaLore.innerHTML = ""

    personagemAtual.lore.forEach((l,i)=>{
        const div = document.createElement("div")
        div.className = "lore-item"

        div.innerHTML = `
            <h4>${l.titulo}</h4>
            <small>${l.data || ''}</small>
            <p>${l.texto}</p>
        `

        const btn = document.createElement("button")
        btn.textContent = "X"

        btn.onclick = async ()=>{
            personagemAtual.lore.splice(i,1)
            await atualizarRPG()
            atualizarReferenciaPersonagem()
            abrirPersonagem()
        }

        div.appendChild(btn)
        listaLore.appendChild(div)
    })
}

// ==========================
// NPCs
// ==========================
formNPC.addEventListener("submit", async (e)=>{
    e.preventDefault()

    const foto = await lerImagem(fotoNPC.files[0])

    rpgAtual.npcs.push({
        id: Date.now(),
        nome: nomeNPC.value,
        desc: descNPC.value,
        hp: Number(hpNPC.value) || 100,
        foto,
        status: "vivo"
    })

    formNPC.reset()
    await atualizarRPG()
    renderNPCs()
})

function renderNPCs(){
    listaNPCs.innerHTML = ""

    rpgAtual.npcs.forEach((n,i)=>{
        if(n.hp === undefined) n.hp = 100

        const div = document.createElement("div")
        div.className = "npc-item"
        div.innerHTML = `
            <strong>${n.nome}</strong> 
            (HP: ${n.hp}) 
            <span class="status-${n.status || 'vivo'}">${n.status || 'vivo'}</span>
            <p>${n.desc}</p>
        `

        const abrir = document.createElement("button")
        abrir.textContent = "Editar"
        abrir.onclick = () => {
            npcAtual = n
            abrirNPC()
        }

        const del = document.createElement("button")
        del.textContent = "Excluir"

        del.onclick = async ()=>{
            if(confirm(`Excluir ${n.nome}?`)){
                rpgAtual.npcs.splice(i,1)
                await atualizarRPG()
                renderNPCs()
            }
        }

        div.appendChild(abrir)
        div.appendChild(del)
        listaNPCs.appendChild(div)
    })
}

function abrirNPC(){
    if(!npcAtual) return
    
    npcSelecionado.style.display = "block"
    tituloNPC.textContent = npcAtual.nome
    imgNPC.src = npcAtual.foto || ""
    descNPCView.textContent = npcAtual.desc
    viewHPNPC.textContent = npcAtual.hp
    
    descNPCEdit.value = npcAtual.desc
    editHPNPC.value = npcAtual.hp
}

window.salvarEdicaoNPC = async function(){
    if(!npcAtual) return
    
    npcAtual.desc = descNPCEdit.value
    npcAtual.hp = Number(editHPNPC.value)
    
    await atualizarRPG()
    atualizarReferenciaNPC()
    renderNPCs()
    abrirNPC()
}

window.excluirNPC = async function(){
    if(!npcAtual) return
    
    if(confirm(`Excluir ${npcAtual.nome}?`)){
        const index = rpgAtual.npcs.findIndex(n => n.id === npcAtual.id)
        if(index !== -1){
            rpgAtual.npcs.splice(index, 1)
            await atualizarRPG()
            renderNPCs()
            npcSelecionado.style.display = "none"
            npcAtual = null
        }
    }
}

// ==========================
// LOCAIS
// ==========================
formLocal.addEventListener("submit", async (e)=>{
    e.preventDefault()

    const foto = await lerImagem(fotoLocal.files[0])

    rpgAtual.locais.push({
        id: Date.now(),
        nome: nomeLocal.value,
        desc: descLocal.value,
        foto,
        visitado: false
    })

    formLocal.reset()
    await atualizarRPG()
    renderLocais()
})

function renderLocais(){
    listaLocais.innerHTML = ""

    rpgAtual.locais.forEach((l,i)=>{
        const div = document.createElement("div")
        div.className = "local-item"

        div.innerHTML = `
            <strong>${l.nome}</strong>
            <span class="visitado-${l.visitado ? 'sim' : 'nao'}">
                ${l.visitado ? '✓ Visitado' : '○ Não visitado'}
            </span>
            <p>${l.desc}</p>
        `

        if(l.foto){
            const img = document.createElement("img")
            img.src = l.foto
            img.style.width = "80px"
            div.appendChild(img)
        }

        const toggleVisitado = document.createElement("button")
        toggleVisitado.textContent = l.visitado ? "Marcar não visitado" : "Marcar visitado"
        toggleVisitado.onclick = async () => {
            l.visitado = !l.visitado
            await atualizarRPG()
            renderLocais()
        }

        const btn = document.createElement("button")
        btn.textContent = "Excluir"

        btn.onclick = async ()=>{
            if(confirm(`Excluir ${l.nome}?`)){
                rpgAtual.locais.splice(i,1)
                await atualizarRPG()
                renderLocais()
            }
        }

        div.appendChild(toggleVisitado)
        div.appendChild(btn)
        listaLocais.appendChild(div)
    })
}

// ==========================
// SESSÕES - TEXTO LIVRE
// ==========================
formSessao.addEventListener("submit", async (e)=>{
    e.preventDefault()

    if(!tituloSessao.value.trim()){
        alert("Por favor, insira um título para a sessão")
        return
    }

    // O resumo agora é texto livre do textarea
    const novoSessao = {
        id: Date.now(),
        titulo: tituloSessao.value,
        resumo: resumoSessao.value || "Sem resumo detalhado",
        data: new Date().toLocaleDateString(),
        participantes: []
    }

    rpgAtual.sessoes.push(novoSessao)

    formSessao.reset()
    await atualizarRPG()
    renderSessoes()
    toggleCriarSessao() // Fecha o formulário
})

function renderSessoes(){
    listaSessoes.innerHTML = ""

    if(rpgAtual.sessoes.length === 0){
        listaSessoes.innerHTML = '<p style="color: #666;">Nenhuma sessão registrada ainda. Clique em "+ Nova Sessão" para começar!</p>'
        return
    }

    // Ordenar por data (mais recente primeiro)
    const sessoesOrdenadas = [...rpgAtual.sessoes].reverse()

    sessoesOrdenadas.forEach((s,i)=>{
        const div = document.createElement("div")
        div.className = "sessao-card"

        const tituloElem = document.createElement("h4")
        tituloElem.textContent = `${s.titulo} ${s.data ? `- ${s.data}` : ''}`
        
        const resumoElem = document.createElement("div")
        resumoElem.className = "resumo-texto"
        
        // Preserva quebras de linha e formatação
        resumoElem.style.whiteSpace = "pre-wrap"
        resumoElem.style.wordWrap = "break-word"
        resumoElem.style.lineHeight = "1.6"
        resumoElem.textContent = s.resumo || "Sem resumo"

        const btn = document.createElement("button")
        btn.textContent = "Excluir"
        btn.className = "delete-sessao-btn"

        btn.onclick = async ()=>{
            if(confirm(`Excluir a sessão "${s.titulo}"?`)){
                const index = rpgAtual.sessoes.findIndex(sessao => sessao.id === s.id)
                if(index !== -1){
                    rpgAtual.sessoes.splice(index, 1)
                    await atualizarRPG()
                    renderSessoes()
                }
            }
        }

        div.appendChild(tituloElem)
        div.appendChild(resumoElem)
        div.appendChild(btn)
        listaSessoes.appendChild(div)
    })
}

// ==========================
// BANCO
// ==========================
function atualizarBanco(){
    dbCompleto.textContent = JSON.stringify(rpgAtual, null, 2)
    
}