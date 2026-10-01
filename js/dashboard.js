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
const doctorName = document.querySelector("#dashboardDoctorName");
const doctorNameTop = document.querySelector("#dashboardDoctorNameTop");

const doctorAvatar = document.querySelector("#dashboardDoctorAvatar");
const doctorAvatarTop = document.querySelector("#dashboardDoctorAvatarTop");

const todayCount = document.querySelector("#dashboardTodayCount");
const patientsCount = document.querySelector("#dashboardPatientsCount");
const appointmentsList = document.querySelector("#dashboardAppointmentsList");


// ===============================
// DATA ATUAL
// ===============================

function getTodayDate() {
    const today = new Date();

    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
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
                <div class="empty-state">
                    <p>Não foi possível carregar as consultas.</p>
                </div>
            `;
        }
    }
}


// ===============================
// MOSTRAR CONSULTAS
// ===============================

function renderAppointments(appointments) {

    if (!appointmentsList) {
        return;
    }

    // Ordena pelo horário
    appointments.sort((a, b) => {
        return String(a.time || "").localeCompare(
            String(b.time || "")
        );
    });


    if (appointments.length === 0) {
        appointmentsList.innerHTML = `
            <div class="empty-state">
                <p>Nenhuma consulta agendada para hoje.</p>
            </div>
        `;

        return;
    }


    appointmentsList.innerHTML = "";


    appointments.forEach((appointment) => {

        const item = document.createElement("div");

        item.className = "appointment-item";

        const status = appointment.status || "Agendada";

        item.innerHTML = `
            <div class="appointment-time">
                ${appointment.time || "--:--"}
            </div>

            <div class="appointment-info">
                <strong>
                    ${appointment.patientName || "Paciente"}
                </strong>

                <span>
                    ${appointment.type || "Consulta"}
                </span>
            </div>

            <div class="appointment-status">
                <span class="status-badge">
                    ${status}
                </span>
            </div>
        `;

        appointmentsList.appendChild(item);
    });
}


// ===============================
// AUTENTICAÇÃO
// ===============================

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    console.log("Dashboard carregando para:", user.email);

    loadDoctorInfo(user);

    await loadDashboard(user);
});