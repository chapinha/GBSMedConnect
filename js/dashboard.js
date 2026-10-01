import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    getDocs,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import { app, db } from "./firebase.js";

const auth = getAuth(app);


// ===============================
// ELEMENTOS DO DASHBOARD
// ===============================

const greeting = document.querySelector("#dashboardGreeting");
const dateLabel = document.querySelector("#dashboardDate");
const summary = document.querySelector("#dashboardSummary");

const doctorName = document.querySelector("#dashboardDoctorName");
const doctorNameTop = document.querySelector("#dashboardDoctorNameTop");

const doctorAvatar = document.querySelector("#dashboardDoctorAvatar");
const doctorAvatarTop = document.querySelector("#dashboardDoctorAvatarTop");

const todayCount = document.querySelector("#dashboardTodayCount");
const patientsCount = document.querySelector("#dashboardPatientsCount");
const appointmentsList = document.querySelector("#dashboardAppointmentsList");


// ===============================
// DATA E HORA ATUAIS
// ===============================

function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getCurrentTime() {
    const now = new Date();

    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${hours}:${minutes}`;
}

function renderTodayDate() {
    if (!dateLabel) {
        return;
    }

    const text = new Date().toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });

    dateLabel.textContent = text.charAt(0).toUpperCase() + text.slice(1);
}


// ===============================
// UTILITÁRIOS
// ===============================

// Evita que dados vindos do banco sejam interpretados como HTML
function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[char]));
}

// Mesmo paciente = sempre a mesma cor de avatar
const AVATAR_TONES = ["aqua", "blue", "purple", "orange"];

function getTone(name) {
    let hash = 0;

    for (const char of String(name)) {
        hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    }

    return AVATAR_TONES[hash % AVATAR_TONES.length];
}

// Converte o texto do status em uma variação de cor do badge
function getStatusVariant(status) {
    const normalized = String(status || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

    if (normalized === "agendada") {
        return "pending";
    }

    if (normalized === "confirmada") {
        return "confirmed";
    }

    if (["concluida", "realizada", "atendida", "finalizada"].includes(normalized)) {
        return "done";
    }

    if (["cancelada", "faltou"].includes(normalized)) {
        return "canceled";
    }

    return "neutral";
}


// ===============================
// INICIAIS DO NOME
// ===============================

function getInitials(name) {
    if (!name) {
        return "GS";
    }

    const parts = name
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }

    return (
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();
}


// ===============================
// NOME DO MÉDICO
// ===============================

function loadDoctorInfo(user) {
    const name = user.displayName || user.email?.split("@")[0] || "Médico";
    const initials = getInitials(name);

    if (greeting) {
        greeting.textContent = `Olá, ${name}! 👋`;
    }

    if (doctorName) {
        doctorName.textContent = name;
    }

    if (doctorNameTop) {
        doctorNameTop.textContent = name;
    }

    if (doctorAvatar) {
        doctorAvatar.textContent = initials;
    }

    if (doctorAvatarTop) {
        doctorAvatarTop.textContent = initials;
    }
}


// ===============================
// CARREGAR DADOS DO FIRESTORE
// ===============================

async function loadDashboard(user) {
    try {
        // ===============================
        // PACIENTES
        // ===============================

        const patientsQuery = query(
            collection(db, "patients"),
            where("doctorId", "==", user.uid)
        );

        const patientsSnapshot = await getDocs(patientsQuery);

        const patients = [];

        patientsSnapshot.forEach((document) => {
            patients.push({
                id: document.id,
                ...document.data()
            });
        });


        // ===============================
        // CONSULTAS
        // ===============================

        const appointmentsQuery = query(
            collection(db, "appointments"),
            where("doctorId", "==", user.uid)
        );

        const appointmentsSnapshot = await getDocs(appointmentsQuery);

        const appointments = [];

        appointmentsSnapshot.forEach((document) => {
            appointments.push({
                id: document.id,
                ...document.data()
            });
        });


        // ===============================
        // CONSULTAS DE HOJE
        // ===============================

        const today = getTodayDate();

        const todayAppointments = appointments.filter(
            appointment => appointment.date === today
        );


        // ===============================
        // TOTAL DE PACIENTES
        // ===============================

        if (patientsCount) {
            patientsCount.textContent = patients.length;
        }


        // ===============================
        // CONSULTAS HOJE
        // ===============================

        if (todayCount) {
            todayCount.textContent = todayAppointments.length;
        }


        // ===============================
        // LISTA DE PRÓXIMAS CONSULTAS
        // ===============================

        renderAppointments(todayAppointments);

    } catch (error) {
        console.error("Erro ao carregar dados do dashboard:", error);

        if (todayCount) {
            todayCount.textContent = "0";
        }

        if (patientsCount) {
            patientsCount.textContent = "0";
        }

        if (appointmentsList) {
            appointmentsList.innerHTML = `
                <div class="dash-empty is-error">
                    <span class="dash-empty-icon">
                        <svg class="ico" aria-hidden="true"><use href="#i-calendar"></use></svg>
                    </span>

                    <strong>Não foi possível carregar as consultas.</strong>

                    <p>Verifique sua conexão e recarregue a página.</p>
                </div>
            `;
        }
    }
}


// ===============================
// RESUMO NO BANNER
// ===============================

function renderSummary(appointments, nextAppointment) {

    if (!summary) {
        return;
    }

    const total = appointments.length;

    if (total === 0) {
        summary.textContent = "Você não tem consultas agendadas para hoje.";
        return;
    }

    let text = total === 1
        ? "Você tem 1 consulta hoje."
        : `Você tem ${total} consultas hoje.`;

    if (nextAppointment && nextAppointment.time) {
        text += ` A próxima é às ${nextAppointment.time}`;

        if (nextAppointment.patientName) {
            text += `, com ${nextAppointment.patientName}`;
        }

        text += ".";
    }

    summary.textContent = text;
}


// ===============================
// MOSTRAR CONSULTAS
// ===============================

function renderAppointments(appointments) {

    if (!appointmentsList) {
        return;
    }

    // Ordena pelo horário (sem alterar a lista original)
    const sorted = [...appointments].sort((a, b) => {
        return String(a.time || "").localeCompare(
            String(b.time || "")
        );
    });

    const now = getCurrentTime();

    // A próxima consulta é a primeira cujo horário ainda não passou
    const nextAppointment = sorted.find(
        appointment => appointment.time && appointment.time >= now
    );

    renderSummary(sorted, nextAppointment);


    if (sorted.length === 0) {
        appointmentsList.innerHTML = `
            <div class="dash-empty">
                <span class="dash-empty-icon">
                    <svg class="ico" aria-hidden="true"><use href="#i-calendar"></use></svg>
                </span>

                <strong>Nenhuma consulta agendada para hoje.</strong>

                <p>Quando uma consulta for marcada para hoje, ela aparece aqui.</p>

                <a href="agenda.html" class="dash-link">
                    Agendar consulta
                    <svg class="ico" aria-hidden="true"><use href="#i-arrow"></use></svg>
                </a>
            </div>
        `;

        return;
    }


    appointmentsList.innerHTML = sorted.map((appointment) => {

        const isNext = appointment === nextAppointment;
        const isPast = Boolean(appointment.time) && appointment.time < now;

        const patientName = appointment.patientName || "Paciente";
        const status = appointment.status || "Agendada";

        const classes = [
            "dash-appt",
            `dash-tone-${getTone(patientName)}`,
            isNext ? "is-next" : "",
            isPast ? "is-past" : ""
        ].filter(Boolean).join(" ");

        return `
            <div class="${classes}" role="listitem">

                <div class="dash-appt-time">
                    <strong>${escapeHtml(appointment.time || "--:--")}</strong>
                    ${isNext ? '<span class="dash-appt-flag">Próxima</span>' : ""}
                </div>

                <div class="dash-appt-rail" aria-hidden="true"></div>

                <div class="dash-appt-card">

                    <div class="dash-appt-avatar" aria-hidden="true">
                        ${escapeHtml(getInitials(appointment.patientName || "Paciente"))}
                    </div>

                    <div class="dash-appt-info">
                        <strong>${escapeHtml(patientName)}</strong>
                        <span>${escapeHtml(appointment.type || "Consulta")}</span>
                    </div>

                    <span class="dash-badge dash-badge--${getStatusVariant(status)}">
                        ${escapeHtml(status)}
                    </span>

                </div>

            </div>
        `;

    }).join("");

    appointmentsList.setAttribute("role", "list");
}


// ===============================
// AUTENTICAÇÃO
// ===============================

renderTodayDate();

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    console.log("Dashboard carregando para:", user.email);

    loadDoctorInfo(user);

    await loadDashboard(user);
});