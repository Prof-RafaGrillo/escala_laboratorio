import os
from dotenv import load_dotenv
from typing import Optional, List
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Field, SQLModel, create_engine, Session, select

#carregar as variaveis de dentro do arquivo .env
load_dotenv()
#PUXA A URL

#=========================================URL do servidor online
DATABASE_URL = os.getenv("DATABASE_URL")
#1. Definicao do Modelo (A receita da sua tabela)

#=========================================URL do servidor local
#DATABASE_URL = "sqlite:///database.db"


# Adicione isso temporariamente para investigarmos
print("----- DEBUG DO BANCO -----")
print("URL carregada:", DATABASE_URL)
print("--------------------------")


#2. Configuracao da conexao
#Dizemos ao Python  para criar um arquivo chamado banco.db localmente

#=========================== BANCO NEON
engine = create_engine(DATABASE_URL)

#========================== BANCO LOCAL
#engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


class Agendamento(SQLModel, table= True):
    id:Optional[int] = Field(default=None, primary_key=True)
    lab_id:str #salva qual laboratorio foi escolhido (ex:1)
    responsavel: str  #Nome do professor
    finalidade: str #Materia ou atividade
    start: str #Data de inicio
    end: str #Data de termino
    fixo: bool = Field(default=False) # Se não for preenchido, nasce como False (não-fixo)





#Funcao auxiliar que are a sessao com o banco e fecha automaticamente quando a rota termina
def get_session():
    with Session(engine) as session:
        yield session


#3. criando a instancia principal do servidor

app = FastAPI()


# ATENÇÃO: Isso permite que o seu arquivo HTML/JS acesse esse servidor Python sem ser bloqueado pelo navegador
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Em producao colocarioa a URL do front, "*" libera geral para testes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)


#4. Evento de inicializacao
@app.on_event("startup")
def on_startup():
    #Esse comando le todos os modelos e cria as tabelas no arquivo .db
    SQLModel.metadata.create_all(engine)

#criando a primeira Rota ou EndPoint

@app.get("/")
def ler_raiz():
    return{"Mensagem": "O backend do LAB_INFO est'a vivo! e o banco de dados foi configurado"}

#ROTA 2: Criar um novo agendamento (POST)
@app.post("/api/agendamentos", response_model=Agendamento)
def criar_agendamento(agendamento: Agendamento, session: Session = Depends(get_session)):
    session.add(agendamento)   #Coloca o agendamento no "carrinho"
    session.commit()    #Salva definitivamente no banco de dados
    session.refresh(agendamento) #Atualiza o objeto com o ID gerado pelo banco
    return agendamento #devolve o agendamento salvo de volta para quem pediu

#ROTA 3: Buscar agendamento filtrados por laboratorio (GET)
@app.get("/api/agendamentos", response_model=List[Agendamento])
def listar_agendamentos(lab_id: str, session: Session = Depends(get_session)):
    #Monta a consulta: "Selecione da tabela agendamento onde o lab_id for igual ao enviado"
    statement = select(Agendamento).where(Agendamento.lab_id == lab_id)

    #Executa a consulta e transforma em uma lista do Python
    resultados = session.exec(statement).all()

    return resultados

#Rota 4: 
@app.delete("/api/agendamentos/{agendamento_id}", status_code=200)
def deletar_agendamentos(agendamento_id:int, db: Session = Depends(get_session)):
    #1.Busca o agendamento pelo ID exato
    agendamento = db.get(Agendamento, agendamento_id)

    #2. Valida se ele realmente existe no banco
    if not agendamento:
        raise HTTPException(
            status_code = 404,
            detail="Agendamento nao encontrado"
        )
    #3. Aplica a sua regra de negocio usando o campo novo
    if agendamento.fixo:
        raise HTTPException(
            status_code = 400,
            detail="Este 'e um agendamento fixo e nao pode ser deletado!"
        )
    #4. Se passou pelas validacoes, deleta
    db.delete(agendamento)
    db.commit()

    return{"message": "Agendamento excluido com sucesso!"}