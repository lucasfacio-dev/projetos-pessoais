// ==========================
// IMPORTS
// ==========================
const express = require("express")
const sqlite3 = require("sqlite3").verbose()
const cors = require("cors")

const app = express()

// ==========================
// CONFIG
// ==========================
app.use(cors())
app.use(express.json({limit:"50mb"})) // IMPORTANTE pra imagens base64

// ==========================
// BANCO DE DADOS
// ==========================
const db = new sqlite3.Database("./banco.db", (err)=>{
    if(err){
        console.error("Erro ao conectar banco:", err)
    }else{
        console.log("Banco conectado com sucesso")
    }
})

// ==========================
// CRIAR TABELA
// ==========================
db.run(`
CREATE TABLE IF NOT EXISTS rpgs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT
)
`)

// ==========================
// FUNÇÃO NORMALIZAR RPG
// (GARANTE COMPATIBILIDADE)
// ==========================
function normalizarRPG(rpg){

    // GARANTE ARRAYS
    if(!rpg.personagens) rpg.personagens = []
    if(!rpg.npcs) rpg.npcs = []
    if(!rpg.locais) rpg.locais = []
    if(!rpg.sessoes) rpg.sessoes = []

    // PERSONAGENS
    rpg.personagens.forEach(p=>{
        if(p.hp === undefined) p.hp = 100
        if(!p.inventario) p.inventario = []
        if(!p.missoes) p.missoes = []
        if(!p.lore) p.lore = []
    })

    // NPCs
    rpg.npcs.forEach(n=>{
        if(n.hp === undefined) n.hp = 100
    })

    return rpg
}

// ==========================
// GET TODOS RPGs
// ==========================
app.get("/rpgs", (req,res)=>{
    db.all("SELECT * FROM rpgs", [], (err, rows)=>{
        if(err) return res.status(500).json(err)

        const rpgs = rows.map(row=>{
            let data = {}

            try{
                data = JSON.parse(row.data)
            }catch{
                data = {}
            }

            data.id = row.id

            return normalizarRPG(data)
        })

        res.json(rpgs)
    })
})

// ==========================
// GET RPG POR ID
// ==========================
app.get("/rpgs/:id", (req,res)=>{
    const id = req.params.id

    db.get("SELECT * FROM rpgs WHERE id=?", [id], (err,row)=>{
        if(err) return res.status(500).json(err)
        if(!row) return res.status(404).send("RPG não encontrado")

        let data = {}

        try{
            data = JSON.parse(row.data)
        }catch{
            data = {}
        }

        data.id = row.id

        res.json(normalizarRPG(data))
    })
})

// ==========================
// CRIAR RPG
// ==========================
app.post("/rpgs", (req,res)=>{
    let rpg = req.body

    rpg = normalizarRPG(rpg)

    db.run(
        "INSERT INTO rpgs (data) VALUES (?)",
        [JSON.stringify(rpg)],
        function(err){
            if(err) return res.status(500).json(err)

            rpg.id = this.lastID
            res.json(rpg)
        }
    )
})

// ==========================
// ATUALIZAR RPG
// ==========================
app.put("/rpgs/:id", (req,res)=>{
    const id = req.params.id
    let rpg = req.body

    rpg = normalizarRPG(rpg)

    db.run(
        "UPDATE rpgs SET data=? WHERE id=?",
        [JSON.stringify(rpg), id],
        function(err){
            if(err) return res.status(500).json(err)

            res.json({success:true})
        }
    )
})

// ==========================
// DELETAR RPG
// ==========================
app.delete("/rpgs/:id", (req,res)=>{
    const id = req.params.id

    db.run(
        "DELETE FROM rpgs WHERE id=?",
        [id],
        function(err){
            if(err) return res.status(500).json(err)

            res.json({success:true})
        }
    )
})

// ==========================
// SERVIDOR
// ==========================
app.listen(3000, ()=>{
    console.log("Servidor rodando em http://localhost:3000")
})