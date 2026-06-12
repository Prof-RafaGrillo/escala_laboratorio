let calendar;
let labIdAtivo = null;
let infoSelecaoAtual = null;

// Executa o codigo assim que a pagina agenda.html é carregada
document.addEventListener("DOMContentLoaded", () => {

    // 1. Pega os parametros da URL(ex: ?lab=5). Se não tiver nada, força ser o "1"
    const parametrosURL = new URLSearchParams(window.location.search);
    labIdAtivo = parametrosURL.get('lab') || "1";
   
    const select = document.getElementById('select-lab');
    
    // Mapeia nomes amigáveis para o título da tela
    const nomesDosLaboratorios = {
        "1": "Laboratório 1 (Manhã)",
        "2": "Laboratório 2 (Manhã)",
        "3": "Laboratório de Ciências (Manhã)",
        "4": "Tablets (Manhã)",
        "5": "Laboratório 1 (Tarde)",
        "6": "Laboratório 2 (Tarde)",
        "7": "Laboratório de Ciências (Tarde)",
        "8": "Tablets (Tarde)"
    };

    // 2. Muda fisicamente a opção selecionada no HTML para bater com a URL
    select.value = labIdAtivo;

    // Inicializar o FullCalendar PRIMEIRO, antes do Select mudar os horários dele
    const calendarEl = document.getElementById('calendar');
    const visaoInicial = window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek';

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: visaoInicial,
        height:"100%",
        locale: 'pt-br',
        expandRows: true,
        displayEventTime:false,
        selectLongPressDelay: 0,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: ''
        },
        hiddenDays: [0, 6], 
        slotMinTime: '07:00:00', 
        slotMaxTime: '13:00:00', 
        slotDuration: '01:00:00', 
        allDaySlot: false, 
        selectable: true, 

        // Substitui a hora pelo número da aula
        slotLabelContent: function(arg) {
            let hora = arg.date.getHours();
            if(hora < 13){
                let numeroDaAula = hora - 6; 
                return { html: `<b>${numeroDaAula}ª Aula</b>` };
            } else {
                let numeroDaAula = hora - 12; 
                return { html: `<b>${numeroDaAula}ª Aula</b>` };
            }
        },

        events: function(info, successCallback, failureCallback) {
            const pedidoBanco = fetch(`https://backend-e53fc75d.fastapicloud.dev/api/agendamentos?lab_id=${labIdAtivo}`)
                .then(res => res.ok ? res.json() : []); 
                console.log(pedidoBanco)
            const pedidoJson = fetch('../data/horarios_fixos.json')
                .then(res => res.ok ? res.json() : []);

            Promise.all([pedidoBanco, pedidoJson])
                .then(([dadosDoBanco, todosOsFixos]) => {
                    const listaBanco = Array.isArray(dadosDoBanco) ? dadosDoBanco : [];
                    const listaFixos = Array.isArray(todosOsFixos) ? todosOsFixos : [];

                    const eventosDoBancoFormatados = listaBanco.map(item => ({
                        id: item.id,
                        title: `${item.responsavel}\n(${item.finalidade})`,
                        start: item.start,
                        end: item.end
                    }));

                    const fixosDoLabAtual = listaFixos.filter(evento => String(evento.lab_id) === String(labIdAtivo));
                    const todosOsEventos = [...eventosDoBancoFormatados, ...fixosDoLabAtual];
                    
                    successCallback(todosOsEventos);
                })
                .catch(error => {
                    console.error("Erro crítico ao carregar dados:", error);
                    failureCallback(error);
                });
        },

        select: function (info) {
            infoSelecaoAtual = info;
            abrirModalParaReserva(info);
        },
    });

    calendar.render();

    // 3. AGORA SIM: Registra o evento de mudança no Select
    select.addEventListener('change', function(e) {
        labIdAtivo = e.target.value;
        alteraTituloLab(nomesDosLaboratorios, labIdAtivo);
        
        if (parseInt(labIdAtivo) >= 5) {
            calendar.setOption('slotMinTime', '13:00:00');
            calendar.setOption('slotMaxTime', '19:00:00');
        } else {
            calendar.setOption('slotMinTime', '07:00:00');
            calendar.setOption('slotMaxTime', '13:00:00');
        }
        
        calendar.refetchEvents(); 
    });

    // 4. E por fim, "finge" um clique no select para aplicar as regras da primeira vez
    select.dispatchEvent(new Event('change'));
    
    // Ouvinte de Resize
    window.addEventListener('resize', () => {
        if (window.innerWidth < 768 && calendar.view.type !== 'timeGridDay') {
            calendar.changeView('timeGridDay');
        } else if (window.innerWidth >= 768 && calendar.view.type !== 'timeGridWeek') {
            calendar.changeView('timeGridWeek');
        }
    });
});

function abrirModalParaReserva(info) {
    document.getElementById('modal-lab-nome').innerText = `Laboratório ${labIdAtivo}`;
    
    const dataFormatada = info.start.toLocaleDateString('pt-BR');
    const horaInterna = info.start.getHours();
    
    // CORREÇÃO: Aplica a mesma regra da manhã/tarde para não exibir "7ª Aula" no modal
    let aulaClicada = 0;
    if (horaInterna < 13) {
        aulaClicada = horaInterna - 6; 
    } else {
        aulaClicada = horaInterna - 12;
    }

    document.getElementById('modal-data').innerText = dataFormatada;
    document.getElementById('modal-horario').innerText = `${aulaClicada}ª Aula`;

    document.getElementById('form-reserva').dataset.start = info.startStr;
    document.getElementById('form-reserva').dataset.end = info.endStr;

    document.getElementById('modal-agendamento').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modal-agendamento').style.display = 'none';
    document.getElementById('form-reserva').reset();
}

function salvarAgendamento(event) {
    event.preventDefault(); 

    const professor = document.getElementById('responsavel').value;
    const atividade = document.getElementById('finalidade').value;
  
    const dadosParaSalvar = {
        lab_id: labIdAtivo,
        responsavel: professor,
        finalidade: atividade,
        start: infoSelecaoAtual.startStr, 
        end: infoSelecaoAtual.endStr
    };

    fetch('https://backend-e53fc75d.fastapicloud.dev/api/agendamentos', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dadosParaSalvar)
    })
    .then(response => {
        if (response.ok) {
            alert("Agendamento realizado com sucesso!");
            calendar.refetchEvents(); 
            fecharModal(); 
        } else {
            alert("Erro ao salvar o agendamento.");
        }
    })
    .catch(error => console.error("Erro na requisição POST:", error));
}

function alteraTituloLab(nomesDosLaboratorios, labIdAtivo){
    document.getElementById('nome-lab').innerText = nomesDosLaboratorios[labIdAtivo] || `Laboratório ${labIdAtivo}`;
}