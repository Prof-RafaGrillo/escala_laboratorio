let calendar;
let labIdAtivo = null


//Executa o codigo assim que a pagina agenda.html 'e carregada
document.addEventListener("DOMContentLoaded", () => {

    //Pega os parametros da URL(ex: ?lab1)
    const parametrosURL = new URLSearchParams(window.location.search)
    const labIdAtivo = parametrosURL.get('lab') || "1";

    document.getElementById('select-lab').value = labIdAtivo
    document.getElementById('nome-lab').innerHTML = `${labIdAtivo}`
    console.log(labIdAtivo)

    //Inicializar o FullCalendar
    const calendarEl = document.getElementById('calendar')

    const visaoInicial = window.innerWidth < 768 ? 'timeGridDay' : 'timeGridWeek';

    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: visaoInicial, // Visão semanal com grade de horários
        height:"100%",
        locale: 'pt-br', // Força o idioma para português
        expandRows: true,
        displayEventTime:false,
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: window.innerWidth < 768 ? '' : '' // Deixamos limpo conforme seu padrão
        },
        hiddenDays: [0, 6], // Oculta Domingo (0) e Sábado (6)
        // --- INÍCIO DAS ALTERAÇÕES ---
        // Cria um espaço interno de exatamente 6 blocos (das 07h às 13h)
        slotMinTime: '07:00:00', 
        slotMaxTime: '13:00:00', 
        slotDuration: '01:00:00', 
        allDaySlot: false, 
        selectable: true, 

        // A MÁGICA: Substitui o texto "07:00" por "1ª Aula", "08:00" por "2ª Aula", etc.
        slotLabelContent: function(arg) {
            let hora = arg.date.getHours();
            let numeroDaAula = hora - 6; // Se a hora interna for 7, vira 1.
            return { html: `<b>${numeroDaAula}ª Aula</b>` };
        },
        // --- FIM DAS ALTERAÇÕES ---
        allDaySlot: false, // Remove a linha de "o dia todo"
        selectable: true, // Permite clicar nos horários vagos

        // Evento disparado quando o usuário clica em um horário VAGO
        select: function (info) {
            abrirModalParaReserva(info);
        },

        // Carrega os dados simulados
        events: obterEventosSimulados(labIdAtivo)
    });

    calendar.render();
    // Ouvinte: Se o usuário mudar o tamanho da tela (ou girar o celular)
    window.addEventListener('resize', () => {
        if (window.innerWidth < 768 && calendar.view.type !== 'timeGridDay') {
            calendar.changeView('timeGridDay');
        } else if (window.innerWidth >= 768 && calendar.view.type !== 'timeGridWeek') {
            calendar.changeView('timeGridWeek');
        }
    });
})


// Ações de Navegação e Modais
function mudarLaboratorio(novoId) {
    window.location.href = `agenda.html?lab=${novoId}`;
}

function abrirModalParaReserva(info) {
    document.getElementById('modal-lab-nome').innerText = `Laboratório ${labIdAtivo}`;
    
    // Pega a data e formata
    const dataFormatada = info.start.toLocaleDateString('pt-BR');
    
    // Descobre em qual aula o usuário clicou baseando-se na hora interna
    const horaInterna = info.start.getHours();
    const aulaClicada = horaInterna - 6; 

    document.getElementById('modal-data').innerText = dataFormatada;
    
    // Atualiza o modal para mostrar "1ª Aula" em vez de "07:00 às 08:00"
    document.getElementById('modal-horario').innerText = `${aulaClicada}ª Aula`;

    // Guarda os dados brutos no formulário para uso no salvamento
    document.getElementById('form-reserva').dataset.start = info.startStr;
    document.getElementById('form-reserva').dataset.end = info.endStr;

    document.getElementById('modal-agendamento').style.display = 'flex';
}

function fecharModal() {
    document.getElementById('modal-agendamento').style.display = 'none';
    document.getElementById('form-reserva').reset();
}

function salvarAgendamento(event) {
    event.preventDefault(); // Impede a página de recarregar

    const responsavel = document.getElementById('responsavel').value;
    const finalidade = document.getElementById('finalidade').value;
    const start = document.getElementById('form-reserva').dataset.start;
    const end = document.getElementById('form-reserva').dataset.end;

    // Adiciona o novo evento visualmente no FullCalendar
    calendar.addEvent({
        title: `RESERVADO: ${responsavel} (${finalidade})`,
        start: start,
        end: end,
        color: '#A0A0A0' // Fica cinza pois agora está ocupado
    });

    alert("Reserva realizada com sucesso (Simulação)!");
    fecharModal();
}

function obterEventosSimulados(labId) {
    // ---- EVENTOS FIXOS (Se repetem toda semana) ----
    
    // Exemplo: Toda Segunda-feira (dia 1), na 1ª Aula (07:00 às 08:00)
    const aulaFixaSegunda = {
        title: 'FIXO: Prof. Marcos (Algoritmos)',
        daysOfWeek: [1], // 1 = Segunda-feira
        startTime: '07:00:00', // 1ª Aula
        endTime: '08:00:00',
        color: '#718096', // Uma cor cinza escuro para diferenciar de reservas temporárias
    };

    // Exemplo: Toda Quarta e Sexta (dias 3 e 5), na 3ª e 4ª Aula (09:00 às 11:00)
    const laboratorioFechadoFixo = {
        title: 'FIXO: Manutenção Preventiva',
        daysOfWeek: [3, 5], // 3 = Quarta, 5 = Sexta
        startTime: '09:00:00', // Começa na 3ª Aula
        endTime: '11:00:00',   // Ocupa a 3ª e a 4ª Aula (termina quando começa a 5ª)
        color: '#E53E3E', // Vermelho para indicar bloqueio fixo
    };


    // ---- LÓGICA DE RETORNO POR LABORATÓRIO ----
    
    if (labId === "1") {
        return [
            aulaFixaSegunda, 
            laboratorioFechadoFixo,
            // Você ainda pode misturar com eventos que acontecem apenas em um dia específico se quiser:
            {
                title: 'RESERVA CASUAL: Profª Ana',
                start: '2026-06-01T11:00:00', // Apenas neste dia específico
                end: '2026-06-01T12:00:00',
                color: '#A0A0A0'
            }
        ];
    }
    
    if (labId === "2") {
        return [
            // O Lab 2 pode ter apenas a manutenção fixa
            laboratorioFechadoFixo 
        ];
    }

    return []; // Outros laboratórios começam vazios
}