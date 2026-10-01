import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    updateDoc,
    deleteDoc,
    doc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import {
    app,
    db
} from "./firebase.js";


const auth = getAuth(app);

// =========================================
// NOTIFICAÇÕES VISUAIS
// =========================================

if (!document.querySelector("#systemNotificationStyles")) {

    const notificationStyle =
        document.createElement("style");

    notificationStyle.id =
        "systemNotificationStyles";

    notificationStyle.textContent = `

        .system-notification {
            position: fixed;
            top: 24px;
            right: 24px;
            z-index: 999999;
            min-width: 280px;
            max-width: 380px;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 14px 18px;
            background: #ffffff;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
            border: 1px solid #e5e7eb;
            transform: translateX(120%);
            opacity: 0;
            transition: transform 0.3s ease, opacity 0.3s ease;
            font-family: Arial, sans-serif;
            box-sizing: border-box;
        }

        .system-notification.show {
            transform: translateX(0);
            opacity: 1;
        }

        .system-notification-icon {
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 16px;
            flex-shrink: 0;
        }

        .system-notification.success .system-notification-icon {
            background: #e8f8f5;
            color: #168f82;
        }

        .system-notification.error .system-notification-icon {
            background: #fee2e2;
            color: #dc2626;
        }

        .system-notification.info .system-notification-icon {
            background: #e0f2fe;
            color: #0284c7;
        }

        .system-notification-text {
            color: #1f2937;
            font-size: 14px;
            font-weight: 500;
            line-height: 1.4;
        }

        @media (max-width: 600px) {
            .system-notification {
                top: 15px;
                left: 15px;
                right: 15px;
                min-width: auto;
                max-width: none;
            }
        }

    `;

    document.head.appendChild(
        notificationStyle
    );

}


function showNotification(
    message,
    type = "success"
) {

    let notification =
        document.querySelector(
            "#systemNotification"
        );

    if (!notification) {

        notification =
            document.createElement("div");

        notification.id =
            "systemNotification";

        document.body.appendChild(
            notification
        );

    }

    const icon =
        type === "success"
            ? "✓"
            : type === "error"
                ? "!"
                : "i";

    notification.innerHTML = `
        <div class="system-notification-icon">
            ${icon}
        </div>

        <div class="system-notification-text">
            ${escapeHtml(message)}
        </div>
    `;

    notification.className =
        `system-notification ${type}`;

    requestAnimationFrame(
        function () {
            notification.classList.add(
                "show"
            );
        }
    );

    clearTimeout(
        window.systemNotificationTimeout
    );

    window.systemNotificationTimeout =
        setTimeout(
            function () {
                notification.classList.remove(
                    "show"
                );
            },
            3000
        );

}


// =========================================
// VARIÁVEIS
// =========================================

let editingPatientId = null;

let currentWeekStart = getMonday(new Date());


// =========================================
// AUTENTICAÇÃO
// =========================================

onAuthStateChanged(auth, async function (user) {

    if (!user) {

        window.location.href = "login.html";

        return;

    }

    console.log("Usuário autenticado:", user.email);

    await loadPatients(user.uid);

    await loadAppointmentPatients(user.uid);

    await loadAppointments(user.uid);

});


console.log("GBSMedConnect iniciado.");


// =========================================
// NOVA CONSULTA
// =========================================

const newAppointmentButton =
    document.querySelector("#newAppointmentButton");

const appointmentModal =
    document.querySelector("#appointmentModal");

const appointmentForm =
    document.querySelector("#appointmentForm");

const closeAppointmentModal =
    document.querySelector("#closeAppointmentModal");

const cancelAppointmentButton =
    document.querySelector("#cancelAppointmentButton");

const saveAppointmentButton =
    document.querySelector("#saveAppointmentButton");


if (newAppointmentButton) {

    newAppointmentButton.addEventListener(
        "click",
        async function () {

            if (appointmentModal) {

                await openAppointmentModal();

            } else {

                window.location.href = "agenda.html";

            }

        }
    );

}


if (closeAppointmentModal) {

    closeAppointmentModal.addEventListener(
        "click",
        closeAppointmentForm
    );

}


if (cancelAppointmentButton) {

    cancelAppointmentButton.addEventListener(
        "click",
        closeAppointmentForm
    );

}


if (appointmentModal) {

    appointmentModal.addEventListener(
        "click",
        function (event) {

            if (event.target === appointmentModal) {

                closeAppointmentForm();

            }

        }
    );

}


// =========================================
// ABRIR MODAL DE CONSULTA
// =========================================

async function openAppointmentModal() {

    if (!appointmentModal) {

        return;

    }


    const user = auth.currentUser;


    if (!user) {

        showNotification("Sua sessão expirou. Faça login novamente.", "error");

        window.location.href = "login.html";

        return;

    }


    if (appointmentForm) {

        delete appointmentForm.dataset.editingAppointmentId;

        appointmentForm.reset();

    }


    if (saveAppointmentButton) {

        saveAppointmentButton.textContent =
            "Salvar consulta";

        saveAppointmentButton.disabled =
            false;

    }


    appointmentModal.classList.add("active");


    await loadAppointmentPatients(user.uid);


    const dateInput =
        document.querySelector("#appointmentDate");


    if (dateInput) {

        const today =
            new Date();

        const todayString =
            formatDateForFirestore(today);

        dateInput.value =
            todayString;

    }

}


// =========================================
// FECHAR MODAL DE CONSULTA
// =========================================

function closeAppointmentForm() {

    if (appointmentModal) {

        appointmentModal.classList.remove("active");

    }


    if (appointmentForm) {

        appointmentForm.reset();

        delete appointmentForm.dataset.editingAppointmentId;

    }


    if (saveAppointmentButton) {

        saveAppointmentButton.disabled = false;

        saveAppointmentButton.textContent =
            "Salvar consulta";

    }

}


// =========================================
// CARREGAR PACIENTES PARA CONSULTA
// =========================================

async function loadAppointmentPatients(doctorId) {

    const patientSelect =
        document.querySelector("#appointmentPatient");


    if (!patientSelect) {

        return;

    }


    try {

        patientSelect.innerHTML = `
            <option value="">
                Selecione um paciente
            </option>
        `;


        const patientsQuery =
            query(
                collection(db, "patients"),
                where("doctorId", "==", doctorId)
            );


        const snapshot =
            await getDocs(patientsQuery);


        const patients = [];


        snapshot.forEach(function (documentSnapshot) {

            const patient =
                documentSnapshot.data();


            patients.push({

                id:
                    documentSnapshot.id,

                name:
                    patient.name || "Paciente"

            });

        });


        patients.sort(function (a, b) {

            return a.name.localeCompare(
                b.name,
                "pt-BR"
            );

        });


        if (patients.length === 0) {

            patientSelect.innerHTML = `
                <option value="">
                    Nenhum paciente cadastrado
                </option>
            `;

            return;

        }


        patients.forEach(function (patient) {

            const option =
                document.createElement("option");


            option.value =
                patient.id;


            option.textContent =
                patient.name;


            patientSelect.appendChild(option);

        });


    } catch (error) {

        console.error(
            "Erro ao carregar pacientes para a consulta:",
            error
        );


        patientSelect.innerHTML = `
            <option value="">
                Erro ao carregar pacientes
            </option>
        `;

    }

}


// =========================================
// SALVAR / EDITAR CONSULTA
// =========================================

if (appointmentForm) {

    appointmentForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const user =
                auth.currentUser;


            if (!user) {

                showNotification("Sua sessão expirou. Faça login novamente.", "error");

                window.location.href =
                    "login.html";

                return;

            }


            const patientSelect =
                document.querySelector(
                    "#appointmentPatient"
                );


            const patientId =
                patientSelect?.value || "";


            const patientName =
                patientSelect?.options[
                    patientSelect.selectedIndex
                ]?.textContent || "";


            const type =
                document.querySelector(
                    "#appointmentType"
                )?.value || "";


            const date =
                document.querySelector(
                    "#appointmentDate"
                )?.value || "";


            const time =
                document.querySelector(
                    "#appointmentTime"
                )?.value || "";


            const notes =
                document.querySelector(
                    "#appointmentNotes"
                )?.value.trim() || "";


            const editingAppointmentId =
                appointmentForm.dataset.editingAppointmentId || "";


            if (
                !patientId ||
                !type ||
                !date ||
                !time
            ) {

                showNotification("Preencha o paciente, tipo, data e horário.", "error");

                return;

            }


            try {

                if (saveAppointmentButton) {

                    saveAppointmentButton.disabled =
                        true;

                    saveAppointmentButton.textContent =
                        editingAppointmentId
                            ? "Salvando alterações..."
                            : "Salvando...";

                }


                // =====================================
                // EDITAR CONSULTA
                // =====================================

                if (editingAppointmentId) {

                    const appointmentReference =
                        doc(
                            db,
                            "appointments",
                            editingAppointmentId
                        );


                    await updateDoc(
                        appointmentReference,
                        {

                            patientId:
                                patientId,

                            patientName:
                                patientName,

                            doctorId:
                                user.uid,

                            date:
                                date,

                            time:
                                time,

                            type:
                                type,

                            notes:
                                notes

                        }
                    );


                    console.log(
                        "Consulta atualizada:",
                        editingAppointmentId
                    );


                    showNotification("Consulta atualizada com sucesso!", "success");


                    closeAppointmentForm();


                    /*
                     * Se a consulta foi alterada para
                     * outra data, levamos o calendário
                     * automaticamente para a semana dela.
                     */

                    setCalendarWeekFromDate(date);


                    await loadAppointments(
                        user.uid
                    );

                }


                // =====================================
                // NOVA CONSULTA
                // =====================================

                else {

                    const appointmentRef =
                        await addDoc(
                            collection(
                                db,
                                "appointments"
                            ),
                            {

                                patientId:
                                    patientId,

                                patientName:
                                    patientName,

                                doctorId:
                                    user.uid,

                                date:
                                    date,

                                time:
                                    time,

                                type:
                                    type,

                                status:
                                    "Agendada",

                                notes:
                                    notes,

                                createdAt:
                                    serverTimestamp()

                            }
                        );


                    console.log(
                        "Consulta cadastrada:",
                        appointmentRef.id
                    );


                    showNotification("Consulta cadastrada com sucesso!", "success");


                    closeAppointmentForm();


                    /*
                     * Depois de cadastrar uma consulta,
                     * o calendário passa automaticamente
                     * para a semana da consulta.
                     */

                    setCalendarWeekFromDate(date);


                    await loadAppointments(
                        user.uid
                    );

                }


            } catch (error) {

                console.error(
                    "Erro ao salvar consulta:",
                    error
                );


                showNotification("Não foi possível salvar a consulta. Verifique o console.", "error");


            } finally {

                if (saveAppointmentButton) {

                    saveAppointmentButton.disabled =
                        false;

                    saveAppointmentButton.textContent =
                        "Salvar consulta";

                }

            }

        }
    );

}


// =========================================
// CARREGAR CONSULTAS DO FIRESTORE
// =========================================

async function loadAppointments(doctorId) {

    const calendarBody =
        document.querySelector(".calendar-body");


    /*
     * Esta função também é chamada no dashboard.
     * Se não existir calendário nessa página,
     * simplesmente não renderizamos o calendário.
     */

    if (!calendarBody) {

        return;

    }


    try {

        console.log(
            "Carregando consultas do Firestore..."
        );


        const appointmentsQuery =
            query(
                collection(
                    db,
                    "appointments"
                ),
                where(
                    "doctorId",
                    "==",
                    doctorId
                )
            );


        const snapshot =
            await getDocs(
                appointmentsQuery
            );


        const appointments = [];


        snapshot.forEach(function (documentSnapshot) {

            const appointment =
                documentSnapshot.data();


            appointments.push({

                id:
                    documentSnapshot.id,

                patientId:
                    appointment.patientId || "",

                patientName:
                    appointment.patientName ||
                    "Paciente",

                date:
                    appointment.date || "",

                time:
                    appointment.time || "",

                type:
                    appointment.type ||
                    "Consulta",

                status:
                    appointment.status ||
                    "Agendada",

                notes:
                    appointment.notes || "",

                createdAt:
                    appointment.createdAt || null

            });

        });


        /*
         * Ordena as consultas por data e horário.
         */

        appointments.sort(function (a, b) {

            const dateA =
                `${a.date} ${a.time}`;

            const dateB =
                `${b.date} ${b.time}`;

            return dateA.localeCompare(dateB);

        });


        console.log(
            "Consultas encontradas:",
            appointments.length
        );


        renderCalendar(
            appointments
        );


        updateAppointmentSummary(
            appointments
        );


    } catch (error) {

        console.error(
            "Erro ao carregar consultas:",
            error
        );

    }

}


// =========================================
// RENDERIZAR AGENDA
// =========================================

function renderCalendar(appointments) {

    const calendarBody =
        document.querySelector(".calendar-body");


    if (!calendarBody) {

        return;

    }


    const calendarRows =
        calendarBody.querySelectorAll(
            ".calendar-row"
        );


    const weekDates =
        getWeekDates(
            currentWeekStart
        );


    updateWeekHeader(
        weekDates
    );


    calendarRows.forEach(function (row) {

        const cells =
            row.querySelectorAll(
                ".calendar-cell"
            );


        const timeColumn =
            row.querySelector(
                ".time-column"
            );


        if (!timeColumn) {

            return;

        }


        const hourText =
            timeColumn.textContent.trim();


        /*
         * Aceita horários como:
         * 08:00
         * 08h
         * 08
         */

        const hourMatch =
            hourText.match(/\d{1,2}/);


        if (!hourMatch) {

            return;

        }


        const rowHour =
            String(
                parseInt(
                    hourMatch[0],
                    10
                )
            ).padStart(2, "0");


        cells.forEach(function (cell, index) {

            const date =
                weekDates[index];


            cell.innerHTML = "";


            if (!date) {

                return;

            }


            const dateString =
                formatDateForFirestore(
                    date
                );


            cell.dataset.date =
                dateString;


            const dayAppointments =
                appointments.filter(
                    function (appointment) {

                        if (
                            appointment.date !==
                            dateString
                        ) {

                            return false;

                        }


                        if (!appointment.time) {

                            return false;

                        }


                        const appointmentHour =
                            String(
                                appointment.time
                            ).substring(
                                0,
                                2
                            );


                        return (
                            appointmentHour ===
                            rowHour
                        );

                    }
                );


            dayAppointments.forEach(
                function (appointment) {

                    createAppointmentBlock(
                        cell,
                        appointment
                    );

                }
            );

        });

    });

}


// =========================================
// CABEÇALHO DA SEMANA
// =========================================

function updateWeekHeader(weekDates) {

    const dayHeaders =
        document.querySelectorAll(
            ".week-header .day-header"
        );


    dayHeaders.forEach(
        function (header, index) {

            const date =
                weekDates[index];


            if (!date) {

                return;

            }


            const span =
                header.querySelector("span");


            const strong =
                header.querySelector("strong");


            if (span) {

                span.textContent =
                    getWeekdayShort(date);

            }


            if (strong) {

                strong.textContent =
                    String(
                        date.getDate()
                    );


                strong.classList.toggle(
                    "selected-day",
                    isSameDay(
                        date,
                        new Date()
                    )
                );

            }

        }
    );


    const currentMonth =
        document.querySelector(
            ".current-month strong"
        );


    if (currentMonth) {

        currentMonth.textContent =
            formatMonthTitle(
                weekDates
            );

    }

}


// =========================================
// CRIAR BLOCO DA CONSULTA
// =========================================

function createAppointmentBlock(
    cell,
    appointment
) {

    const block =
        document.createElement("div");


    block.className =
        "appointment-block " +
        getAppointmentColor(
            appointment.type
        );


    block.title =
        `${appointment.patientName} - ${appointment.type} - ${appointment.time}`;


    block.style.cursor =
        "pointer";


    block.innerHTML = `

        <strong>
            ${escapeHtml(
                appointment.patientName
            )}
        </strong>

        <span>
            ${escapeHtml(
                appointment.type
            )}
        </span>

        <small style="
            display:block;
            margin-top:4px;
            font-size:10px;
            opacity:0.75;
        ">
            ${escapeHtml(
                appointment.time
            )}
        </small>

    `;


    block.addEventListener(
        "click",
        function (event) {

            event.stopPropagation();

            openAppointmentDetails(
                appointment
            );

        }
    );


    cell.appendChild(
        block
    );

}


// =========================================
// MODAL DE DETALHES DA CONSULTA
// =========================================

function createAppointmentDetailsModal() {

    if (
        document.querySelector(
            "#appointmentDetailsModal"
        )
    ) {

        return;

    }


    const modal =
        document.createElement("div");


    modal.id =
        "appointmentDetailsModal";


    modal.className =
        "appointment-details-modal";


    modal.innerHTML = `

        <div class="appointment-details-content">

            <div class="appointment-details-header">

                <div>

                    <h2>
                        Detalhes da consulta
                    </h2>

                    <p>
                        Informações cadastradas para esta consulta.
                    </p>

                </div>

                <button
                    type="button"
                    class="appointment-details-close"
                    id="closeAppointmentDetailsModal"
                >
                    ×
                </button>

            </div>


            <div class="appointment-details-patient">

                <div
                    class="appointment-details-avatar"
                    id="appointmentDetailsInitials"
                >
                    PA
                </div>

                <div>

                    <h3 id="appointmentDetailsPatient">
                        -
                    </h3>

                    <span>
                        Paciente
                    </span>

                </div>

            </div>


            <div class="appointment-details-grid">

                <div class="appointment-details-field">

                    <span>
                        Data
                    </span>

                    <strong id="appointmentDetailsDate">
                        -
                    </strong>

                </div>


                <div class="appointment-details-field">

                    <span>
                        Horário
                    </span>

                    <strong id="appointmentDetailsTime">
                        -
                    </strong>

                </div>


                <div class="appointment-details-field">

                    <span>
                        Tipo de consulta
                    </span>

                    <strong id="appointmentDetailsType">
                        -
                    </strong>

                </div>


                <div class="appointment-details-field">

                    <span>
                        Status
                    </span>

                    <strong id="appointmentDetailsStatus">
                        -
                    </strong>

                </div>


                <div class="appointment-details-field full-width">

                    <span>
                        Observações
                    </span>

                    <strong id="appointmentDetailsNotes">
                        -
                    </strong>

                </div>

            </div>


            <div class="appointment-details-footer">

                <button
                    type="button"
                    class="appointment-details-button"
                    id="closeAppointmentDetailsButton"
                >
                    Fechar
                </button>


                <button
                    type="button"
                    class="appointment-details-delete-button"
                    id="deleteAppointmentDetailsButton"
                >
                    Excluir consulta
                </button>


                <button
                    type="button"
                    class="appointment-details-edit-button"
                    id="editAppointmentDetailsButton"
                >
                    Editar consulta
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const style =
        document.createElement("style");


    style.id =
        "appointmentDetailsModalStyles";


    style.textContent = `

        .appointment-details-modal {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 100001;
            background: rgba(15, 23, 42, 0.45);
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .appointment-details-modal.active {
            display: flex !important;
        }

        .appointment-details-content {
            width: 100%;
            max-width: 650px;
            max-height: 90vh;
            overflow-y: auto;
            background: #ffffff;
            border-radius: 18px;
            padding: 28px;
            box-sizing: border-box;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
        }

        .appointment-details-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            margin-bottom: 22px;
        }

        .appointment-details-header h2 {
            margin: 0 0 6px;
            font-size: 22px;
            color: #1f2937;
        }

        .appointment-details-header p {
            margin: 0;
            font-size: 13px;
            color: #718096;
        }

        .appointment-details-close {
            border: none;
            background: #f1f5f4;
            color: #64748b;
            width: 36px;
            height: 36px;
            border-radius: 10px;
            font-size: 24px;
            cursor: pointer;
        }

        .appointment-details-close:hover {
            background: #e8f8f5;
            color: #168f82;
        }

        .appointment-details-patient {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 18px;
            background: #f5f9f8;
            border-radius: 14px;
            margin-bottom: 22px;
        }

        .appointment-details-avatar {
            width: 58px;
            height: 58px;
            border-radius: 50%;
            background: #e8f8f5;
            color: #168f82;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 18px;
        }

        .appointment-details-patient h3 {
            margin: 0 0 4px;
            color: #1f2937;
            font-size: 19px;
        }

        .appointment-details-patient span {
            color: #718096;
            font-size: 13px;
        }

        .appointment-details-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        .appointment-details-field {
            border: 1px solid #e8eeee;
            border-radius: 12px;
            padding: 15px;
            min-width: 0;
        }

        .appointment-details-field.full-width {
            grid-column: 1 / -1;
        }

        .appointment-details-field span {
            display: block;
            font-size: 12px;
            color: #718096;
            margin-bottom: 6px;
        }

        .appointment-details-field strong {
            display: block;
            font-size: 14px;
            color: #1f2937;
            word-break: break-word;
        }

        .appointment-details-footer {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid #e8eeee;
        }

        .appointment-details-button {
            border: 1px solid #dbe5e3;
            background: #ffffff;
            color: #4b5563;
            padding: 11px 20px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
        }

        .appointment-details-button:hover {
            background: #f5f9f8;
        }

        .appointment-details-edit-button {
            border: none;
            background: #20b8a6;
            color: #ffffff;
            padding: 11px 20px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
        }

        .appointment-details-edit-button:hover {
            background: #168f82;
        }

        .appointment-details-delete-button {
            border: 1px solid #f0c4c4;
            background: #fff0f0;
            color: #b42318;
            padding: 11px 20px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
        }

        .appointment-details-delete-button:hover {
            background: #fde0e0;
        }

        @media (max-width: 650px) {

            .appointment-details-grid {
                grid-template-columns: 1fr;
            }

            .appointment-details-field.full-width {
                grid-column: auto;
            }

            .appointment-details-content {
                padding: 20px;
            }

            .appointment-details-footer {
                flex-direction: column;
            }

            .appointment-details-button,
            .appointment-details-edit-button,
            .appointment-details-delete-button {
                width: 100%;
            }

        }

    `;


    document.head.appendChild(
        style
    );


    const closeButton =
        document.querySelector(
            "#closeAppointmentDetailsModal"
        );


    const closeFooterButton =
        document.querySelector(
            "#closeAppointmentDetailsButton"
        );


    const editAppointmentButton =
        document.querySelector(
            "#editAppointmentDetailsButton"
        );


    const deleteAppointmentButton =
        document.querySelector(
            "#deleteAppointmentDetailsButton"
        );


    if (deleteAppointmentButton) {

        deleteAppointmentButton.addEventListener(
            "click",
            function () {

                if (
                    window.currentAppointmentDetails
                ) {

                    deleteAppointment(
                        window.currentAppointmentDetails
                    );

                }

            }
        );

    }


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeAppointmentDetails
        );

    }


    if (closeFooterButton) {

        closeFooterButton.addEventListener(
            "click",
            closeAppointmentDetails
        );

    }


    if (editAppointmentButton) {

        editAppointmentButton.addEventListener(
            "click",
            function () {

                if (
                    window.currentAppointmentDetails
                ) {

                    const appointment =
                        window.currentAppointmentDetails;


                    closeAppointmentDetails();


                    openEditAppointment(
                        appointment
                    );

                }

            }
        );

    }


    modal.addEventListener(
        "click",
        function (event) {

            if (
                event.target === modal
            ) {

                closeAppointmentDetails();

            }

        }
    );

}


// =========================================
// ABRIR DETALHES DA CONSULTA
// =========================================

function openAppointmentDetails(
    appointment
) {

    createAppointmentDetailsModal();


    window.currentAppointmentDetails =
        appointment;


    const modal =
        document.querySelector(
            "#appointmentDetailsModal"
        );


    const patientName =
        document.querySelector(
            "#appointmentDetailsPatient"
        );


    const initials =
        document.querySelector(
            "#appointmentDetailsInitials"
        );


    const date =
        document.querySelector(
            "#appointmentDetailsDate"
        );


    const time =
        document.querySelector(
            "#appointmentDetailsTime"
        );


    const type =
        document.querySelector(
            "#appointmentDetailsType"
        );


    const status =
        document.querySelector(
            "#appointmentDetailsStatus"
        );


    const notes =
        document.querySelector(
            "#appointmentDetailsNotes"
        );


    if (patientName) {

        patientName.textContent =
            appointment.patientName || "-";

    }


    if (initials) {

        initials.textContent =
            getInitials(
                appointment.patientName
            );

    }


    if (date) {

        date.textContent =
            formatDateForDisplay(
                appointment.date
            );

    }


    if (time) {

        time.textContent =
            appointment.time || "-";

    }


    if (type) {

        type.textContent =
            appointment.type || "-";

    }


    if (status) {

        status.textContent =
            appointment.status || "-";

    }


    if (notes) {

        notes.textContent =
            appointment.notes ||
            "Nenhuma observação.";

    }


    if (modal) {

        modal.classList.add(
            "active"
        );

    }

}


// =========================================
// EDITAR CONSULTA
// =========================================

async function openEditAppointment(
    appointment
) {

    if (!appointment) {

        return;

    }


    const modal =
        document.querySelector(
            "#appointmentModal"
        );


    const form =
        document.querySelector(
            "#appointmentForm"
        );


    if (!modal || !form) {

        showNotification("Não foi possível abrir o formulário de edição.", "error");

        return;

    }


    const user =
        auth.currentUser;


    if (!user) {

        showNotification("Sua sessão expirou. Faça login novamente.", "error");

        window.location.href =
            "login.html";

        return;

    }


    await loadAppointmentPatients(
        user.uid
    );


    const patientInput =
        document.querySelector(
            "#appointmentPatient"
        );


    const typeInput =
        document.querySelector(
            "#appointmentType"
        );


    const dateInput =
        document.querySelector(
            "#appointmentDate"
        );


    const timeInput =
        document.querySelector(
            "#appointmentTime"
        );


    const notesInput =
        document.querySelector(
            "#appointmentNotes"
        );


    if (patientInput) {

        patientInput.value =
            appointment.patientId || "";

    }


    if (typeInput) {

        typeInput.value =
            appointment.type || "";

    }


    if (dateInput) {

        dateInput.value =
            appointment.date || "";

    }


    if (timeInput) {

        timeInput.value =
            appointment.time || "";

    }


    if (notesInput) {

        notesInput.value =
            appointment.notes || "";

    }


    form.dataset.editingAppointmentId =
        appointment.id;


    if (saveAppointmentButton) {

        saveAppointmentButton.textContent =
            "Salvar alterações";

    }


    modal.classList.add(
        "active"
    );

}


// =========================================
// FECHAR DETALHES DA CONSULTA
// =========================================

function closeAppointmentDetails() {

    const modal =
        document.querySelector(
            "#appointmentDetailsModal"
        );


    if (modal) {

        modal.classList.remove(
            "active"
        );

    }

}


// =========================================
// MODAL DE CONFIRMAÇÃO DE EXCLUSÃO
// =========================================

function createDeleteAppointmentConfirmModal() {

    if (
        document.querySelector(
            "#deleteAppointmentConfirmModal"
        )
    ) {

        return;

    }


    const modal =
        document.createElement("div");


    modal.id =
        "deleteAppointmentConfirmModal";


    modal.className =
        "delete-confirm-modal";


    modal.innerHTML = `

        <div class="delete-confirm-content">

            <div class="delete-confirm-icon">
                !
            </div>

            <h2>
                Excluir consulta
            </h2>

            <p id="deleteAppointmentConfirmMessage">
                Tem certeza que deseja excluir esta consulta?
            </p>

            <div class="delete-confirm-footer">

                <button
                    type="button"
                    class="delete-confirm-cancel-button"
                    id="cancelDeleteAppointmentButton"
                >
                    Cancelar
                </button>

                <button
                    type="button"
                    class="delete-confirm-confirm-button"
                    id="confirmDeleteAppointmentButton"
                >
                    Excluir consulta
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const style =
        document.createElement("style");


    style.id =
        "deleteConfirmModalStyles";


    style.textContent = `

        .delete-confirm-modal {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 100002;
            background: rgba(15, 23, 42, 0.5);
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .delete-confirm-modal.active {
            display: flex !important;
        }

        .delete-confirm-content {
            width: 100%;
            max-width: 400px;
            background: #ffffff;
            border-radius: 18px;
            padding: 30px;
            box-sizing: border-box;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
            text-align: center;
        }

        .delete-confirm-icon {
            width: 56px;
            height: 56px;
            margin: 0 auto 18px;
            border-radius: 50%;
            background: #fee2e2;
            color: #dc2626;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 28px;
            font-weight: 700;
        }

        .delete-confirm-content h2 {
            margin: 0 0 10px;
            font-size: 19px;
            color: #1f2937;
        }

        .delete-confirm-content p {
            margin: 0;
            font-size: 14px;
            color: #718096;
            line-height: 1.5;
        }

        .delete-confirm-footer {
            display: flex;
            justify-content: center;
            gap: 10px;
            margin-top: 26px;
        }

        .delete-confirm-cancel-button {
            flex: 1;
            border: 1px solid #dbe5e3;
            background: #ffffff;
            color: #4b5563;
            padding: 12px 18px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
        }

        .delete-confirm-cancel-button:hover {
            background: #f5f9f8;
        }

        .delete-confirm-confirm-button {
            flex: 1;
            border: none;
            background: #dc2626;
            color: #ffffff;
            padding: 12px 18px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
        }

        .delete-confirm-confirm-button:hover {
            background: #b91c1c;
        }

        @media (max-width: 480px) {

            .delete-confirm-footer {
                flex-direction: column-reverse;
            }

        }

    `;


    document.head.appendChild(
        style
    );


    const cancelButton =
        document.querySelector(
            "#cancelDeleteAppointmentButton"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeDeleteAppointmentConfirm
        );

    }


    modal.addEventListener(
        "click",
        function (event) {

            if (
                event.target === modal
            ) {

                closeDeleteAppointmentConfirm();

            }

        }
    );

}


// =========================================
// ABRIR CONFIRMAÇÃO DE EXCLUSÃO
// =========================================

function openDeleteAppointmentConfirm(appointment) {

    createDeleteAppointmentConfirmModal();


    const modal =
        document.querySelector(
            "#deleteAppointmentConfirmModal"
        );


    const message =
        document.querySelector(
            "#deleteAppointmentConfirmMessage"
        );


    const confirmButton =
        document.querySelector(
            "#confirmDeleteAppointmentButton"
        );


    if (message) {

        message.textContent =
            `Tem certeza que deseja excluir a consulta de "${appointment.patientName || "paciente"}"? Essa ação não pode ser desfeita.`;

    }


    if (confirmButton) {

        confirmButton.onclick =
            async function () {

                confirmButton.disabled =
                    true;

                confirmButton.textContent =
                    "Excluindo...";


                await performAppointmentDeletion(
                    appointment
                );


                confirmButton.disabled =
                    false;

                confirmButton.textContent =
                    "Excluir consulta";

            };

    }


    if (modal) {

        modal.classList.add(
            "active"
        );

    }

}


// =========================================
// FECHAR CONFIRMAÇÃO DE EXCLUSÃO
// =========================================

function closeDeleteAppointmentConfirm() {

    const modal =
        document.querySelector(
            "#deleteAppointmentConfirmModal"
        );


    if (modal) {

        modal.classList.remove(
            "active"
        );

    }

}


// =========================================
// EXCLUIR CONSULTA
// =========================================

async function deleteAppointment(appointment) {

    if (!appointment || !appointment.id) {

        showNotification("Não foi possível identificar a consulta.", "error");

        return;

    }


    openDeleteAppointmentConfirm(
        appointment
    );

}


// =========================================
// EXECUTAR EXCLUSÃO DA CONSULTA
// =========================================

async function performAppointmentDeletion(appointment) {

    try {

        const appointmentReference =
            doc(
                db,
                "appointments",
                appointment.id
            );


        await deleteDoc(
            appointmentReference
        );


        closeDeleteAppointmentConfirm();

        closeAppointmentDetails();


        showNotification("Consulta excluída com sucesso!", "success");


        await refreshCalendar();


    } catch (error) {

        console.error(
            "Erro ao excluir consulta:",
            error
        );


        showNotification("Não foi possível excluir a consulta. Verifique o console.", "error");

    }

}


// =========================================
// COR DA CONSULTA
// =========================================

function getAppointmentColor(type) {

    if (!type) {

        return "green";

    }


    const normalized =
        type
            .toLowerCase()
            .trim();


    if (
        normalized.includes("retorno")
    ) {

        return "blue";

    }


    if (
        normalized.includes("avalia")
    ) {

        return "purple";

    }


    if (
        normalized.includes("acompanhamento")
    ) {

        return "orange";

    }


    return "green";

}


// =========================================
// NAVEGAÇÃO DA AGENDA
// =========================================

const calendarNavigationButtons =
    document.querySelectorAll(
        ".calendar-nav"
    );


if (
    calendarNavigationButtons.length >= 2
) {

    calendarNavigationButtons[0].addEventListener(
        "click",
        async function () {

            currentWeekStart =
                addDays(
                    currentWeekStart,
                    -7
                );


            await refreshCalendar();

        }
    );


    calendarNavigationButtons[1].addEventListener(
        "click",
        async function () {

            currentWeekStart =
                addDays(
                    currentWeekStart,
                    7
                );


            await refreshCalendar();

        }
    );

}


// =========================================
// BOTÃO HOJE
// =========================================

const todayButton =
    document.querySelector(
        ".today-button"
    );


if (todayButton) {

    todayButton.addEventListener(
        "click",
        async function () {

            currentWeekStart =
                getMonday(
                    new Date()
                );


            await refreshCalendar();

        }
    );

}


// =========================================
// ATUALIZAR AGENDA
// =========================================

async function refreshCalendar() {

    const user =
        auth.currentUser;


    if (!user) {

        return;

    }


    await loadAppointments(
        user.uid
    );

}


// =========================================
// COLOCAR CALENDÁRIO NA SEMANA DA DATA
// =========================================

function setCalendarWeekFromDate(
    dateString
) {

    if (!dateString) {

        return;

    }


    const selectedDate =
        new Date(
            `${dateString}T00:00:00`
        );


    if (
        Number.isNaN(
            selectedDate.getTime()
        )
    ) {

        return;

    }


    currentWeekStart =
        getMonday(
            selectedDate
        );

}


// =========================================
// BOTÕES SEMANA / DIA / LISTA
// =========================================

const viewButtons =
    document.querySelectorAll(
        ".view-button"
    );


viewButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {

                viewButtons.forEach(
                    function (item) {

                        item.classList.remove(
                            "active"
                        );

                    }
                );


                button.classList.add(
                    "active"
                );


                const view =
                    button.textContent
                        .trim()
                        .toLowerCase();


                if (view === "semana") {

                    showWeekView();

                }


                if (view === "dia") {

                    showDayView();

                }


                if (view === "lista") {

                    showListView();

                }

            }
        );

    }
);


// =========================================
// VISÃO SEMANA
// =========================================

function showWeekView() {

    const rows =
        document.querySelectorAll(
            ".calendar-row"
        );


    rows.forEach(
        function (row) {

            row.style.display =
                "";

        }
    );


    const headers =
        document.querySelectorAll(
            ".day-header"
        );


    headers.forEach(
        function (header) {

            header.style.display =
                "";

        }
    );


    const cells =
        document.querySelectorAll(
            ".calendar-cell"
        );


    cells.forEach(
        function (cell) {

            cell.style.display =
                "";

        }
    );


    const timeColumns =
        document.querySelectorAll(
            ".time-column"
        );


    timeColumns.forEach(
        function (column) {

            column.style.display =
                "";

        }
    );


    refreshCalendar();

}


// =========================================
// VISÃO DIA
// =========================================

function showDayView() {

    const today =
        new Date();


    let selectedIndex =
        0;


    const weekDates =
        getWeekDates(
            currentWeekStart
        );


    weekDates.forEach(
        function (date, index) {

            if (
                isSameDay(
                    date,
                    today
                )
            ) {

                selectedIndex =
                    index;

            }

        }
    );


    const headers =
        document.querySelectorAll(
            ".day-header"
        );


    headers.forEach(
        function (header, index) {

            header.style.display =
                index === selectedIndex
                    ? ""
                    : "none";

        }
    );


    const rows =
        document.querySelectorAll(
            ".calendar-row"
        );


    rows.forEach(
        function (row) {

            const cells =
                row.querySelectorAll(
                    ".calendar-cell"
                );


            cells.forEach(
                function (cell, index) {

                    cell.style.display =
                        index === selectedIndex
                            ? ""
                            : "none";

                }
            );

        }
    );

}


// =========================================
// VISÃO LISTA
// =========================================

function showListView() {

    const user =
        auth.currentUser;


    if (!user) {

        return;

    }


    loadAppointmentList(
        user.uid
    );

}


// =========================================
// LISTA DE CONSULTAS
// =========================================

async function loadAppointmentList(
    doctorId
) {

    const calendarBody =
        document.querySelector(
            ".calendar-body"
        );


    if (!calendarBody) {

        return;

    }


    try {

        const appointmentsQuery =
            query(
                collection(
                    db,
                    "appointments"
                ),
                where(
                    "doctorId",
                    "==",
                    doctorId
                )
            );


        const snapshot =
            await getDocs(
                appointmentsQuery
            );


        const appointments = [];


        snapshot.forEach(
            function (documentSnapshot) {

                const appointment =
                    documentSnapshot.data();


                appointments.push({

                    id:
                        documentSnapshot.id,

                    patientId:
                        appointment.patientId || "",

                    patientName:
                        appointment.patientName ||
                        "Paciente",

                    date:
                        appointment.date || "",

                    time:
                        appointment.time || "",

                    type:
                        appointment.type ||
                        "Consulta",

                    status:
                        appointment.status ||
                        "Agendada",

                    notes:
                        appointment.notes || "",

                    createdAt:
                        appointment.createdAt || null

                });

            }
        );


        appointments.sort(
            function (a, b) {

                const dateA =
                    `${a.date} ${a.time}`;

                const dateB =
                    `${b.date} ${b.time}`;

                return dateA.localeCompare(
                    dateB
                );

            }
        );


        calendarBody.innerHTML = "";


        if (appointments.length === 0) {

            calendarBody.innerHTML = `

                <div style="
                    padding:40px;
                    text-align:center;
                    color:#718096;
                    font-size:14px;
                ">
                    Nenhuma consulta cadastrada.
                </div>

            `;

            return;

        }


        appointments.forEach(
            function (appointment) {

                const item =
                    document.createElement(
                        "div"
                    );


                item.style.cssText = `
                    padding:15px 20px;
                    border-bottom:1px solid #e8eeee;
                    display:flex;
                    justify-content:space-between;
                    align-items:center;
                    gap:15px;
                    background:#ffffff;
                    cursor:pointer;
                `;


                item.innerHTML = `

                    <div>

                        <strong style="
                            display:block;
                            color:#1f2937;
                            margin-bottom:4px;
                        ">
                            ${escapeHtml(
                                appointment.patientName
                            )}
                        </strong>

                        <span style="
                            color:#718096;
                            font-size:12px;
                        ">
                            ${formatDateForDisplay(
                                appointment.date
                            )}
                            às
                            ${escapeHtml(
                                appointment.time
                            )}
                        </span>

                    </div>


                    <div style="
                        text-align:right;
                    ">

                        <strong style="
                            display:block;
                            color:#168f82;
                            font-size:13px;
                        ">
                            ${escapeHtml(
                                appointment.type
                            )}
                        </strong>

                        <span style="
                            color:#718096;
                            font-size:11px;
                        ">
                            ${escapeHtml(
                                appointment.status
                            )}
                        </span>

                    </div>

                `;


                item.addEventListener(
                    "click",
                    function () {

                        openAppointmentDetails(
                            appointment
                        );

                    }
                );


                calendarBody.appendChild(
                    item
                );

            }
        );


    } catch (error) {

        console.error(
            "Erro ao carregar lista de consultas:",
            error
        );

    }

}


// =========================================
// RESUMO DA AGENDA
// =========================================

function updateAppointmentSummary(
    appointments
) {

    const today =
        formatDateForFirestore(
            new Date()
        );


    const todayAppointments =
        appointments.filter(
            function (appointment) {

                return (
                    appointment.date ===
                    today
                );

            }
        );


    const confirmedAppointments =
        appointments.filter(
            function (appointment) {

                const status =
                    String(
                        appointment.status || ""
                    )
                        .toLowerCase()
                        .trim();


                return (
                    status ===
                    "confirmada"
                );

            }
        );


    const waitingAppointments =
        appointments.filter(
            function (appointment) {

                const status =
                    String(
                        appointment.status || ""
                    )
                        .toLowerCase()
                        .trim();


                return (
                    status ===
                    "agendada"
                );

            }
        );


    const todayCounter =
        document.querySelector(
            "#todayAppointments"
        );


    const confirmedCounter =
        document.querySelector(
            "#confirmedAppointments"
        );


    const waitingCounter =
        document.querySelector(
            "#waitingAppointments"
        );


    const nextAppointment =
        document.querySelector(
            "#nextAppointment"
        );


    if (todayCounter) {

        todayCounter.textContent =
            String(
                todayAppointments.length
            ).padStart(
                2,
                "0"
            );

    }


    if (confirmedCounter) {

        confirmedCounter.textContent =
            String(
                confirmedAppointments.length
            ).padStart(
                2,
                "0"
            );

    }


    if (waitingCounter) {

        waitingCounter.textContent =
            String(
                waitingAppointments.length
            ).padStart(
                2,
                "0"
            );

    }


    if (nextAppointment) {

        const now =
            new Date();


        const upcoming =
            appointments
                .filter(
                    function (appointment) {

                        if (!appointment.date) {

                            return false;

                        }


                        const appointmentDate =
                            new Date(
                                `${appointment.date}T${appointment.time || "00:00"}`
                            );


                        return (
                            appointmentDate >=
                            now
                        );

                    }
                )
                .sort(
                    function (a, b) {

                        const dateA =
                            new Date(
                                `${a.date}T${a.time || "00:00"}`
                            );


                        const dateB =
                            new Date(
                                `${b.date}T${b.time || "00:00"}`
                            );


                        return (
                            dateA - dateB
                        );

                    }
                );


        if (upcoming.length > 0) {

            nextAppointment.textContent =
                upcoming[0].time || "--:--";

        } else {

            nextAppointment.textContent =
                "--:--";

        }

    }

}


// =========================================
// ELEMENTOS DO MODAL DE PACIENTE
// =========================================

const patientForm =
    document.querySelector("#patientForm");

const savePatientButton =
    document.querySelector("#savePatientButton");

const patientModal =
    document.querySelector("#patientModal");

const patientModalTitle =
    document.querySelector("#patientModalTitle");

const patientModalDescription =
    document.querySelector("#patientModalDescription");



    // =========================================
// VALIDAÇÃO DOS CAMPOS DO PACIENTE
// =========================================

function getOnlyNumbers(value) {

    return String(value || "").replace(/\D/g, "");

}


function limitPatientInput(input, maxDigits) {

    if (!input) {
        return;
    }

    input.addEventListener(
        "input",
        function () {

            input.value =
                getOnlyNumbers(input.value).slice(
                    0,
                    maxDigits
                );

        }
    );

}


const patientCpfInput =
    document.querySelector("#patientCpf");

const patientPhoneInput =
    document.querySelector("#patientPhone");


// CPF brasileiro possui no máximo 11 números.
limitPatientInput(
    patientCpfInput,
    11
);


// Telefone brasileiro com DDD possui 10 ou 11 números.
// 10 = telefone fixo | 11 = telefone celular.
limitPatientInput(
    patientPhoneInput,
    11
);

// =========================================
// CADASTRO / EDIÇÃO DE PACIENTE
// =========================================

if (patientForm) {

    patientForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const user =
                auth.currentUser;


            if (!user) {

                showNotification("Sua sessão expirou. Faça login novamente.", "error");

                window.location.href =
                    "login.html";

                return;

            }


            const name =
                document.querySelector(
                    "#patientName"
                ).value.trim();


            const cpf =
                document.querySelector(
                    "#patientCpf"
                ).value.trim();


            const birthDate =
                document.querySelector(
                    "#patientBirthDate"
                ).value;


            const phone =
                document.querySelector(
                    "#patientPhone"
                ).value.trim();


            const email =
                document.querySelector(
                    "#patientEmail"
                ).value.trim();


            const address =
                document.querySelector(
                    "#patientAddress"
                ).value.trim();


            if (!name || !birthDate) {

                showNotification("Preencha o nome e a data de nascimento.", "error");

                return;

            }

const normalizedCpf =
    getOnlyNumbers(cpf).slice(0, 11);

const normalizedPhone =
    getOnlyNumbers(phone).slice(0, 11);


if (!name || !birthDate) {

    showNotification(
        "Preencha o nome e a data de nascimento.",
        "error"
    );

    return;

}


if (
    normalizedCpf.length > 0 &&
    normalizedCpf.length !== 11
) {

    showNotification(
        "O CPF deve ter exatamente 11 números.",
        "error"
    );

    return;

}


if (
    normalizedPhone.length > 0 &&
    normalizedPhone.length !== 10 &&
    normalizedPhone.length !== 11
) {

    showNotification(
        "O telefone deve ter 10 ou 11 números, contando o DDD.",
        "error"
    );

    return;

}
            
            
            try {

                if (savePatientButton) {

                    savePatientButton.disabled =
                        true;

                    savePatientButton.textContent =
                        editingPatientId
                            ? "Salvando alterações..."
                            : "Salvando...";

                }


                if (editingPatientId) {

                    const patientReference =
                        doc(
                            db,
                            "patients",
                            editingPatientId
                        );


                    await updateDoc(
                        patientReference,
                        {

                            name:
                                name,

                            cpf:
                                cpf,

                            birthDate:
                                birthDate,

                            phone:
                                phone,

                            email:
                                email,

                            address:
                                address

                        }
                    );


                    updatePatientRow({

                        id:
                            editingPatientId,

                        name:
                            name,

                        cpf:
                            cpf,

                        birthDate:
                            birthDate,

                        phone:
                            phone,

                        email:
                            email,

                        address:
                            address

                    });


                    showNotification("Paciente atualizado com sucesso!", "success");

                }

                else {

                    const patientRef =
                        await addDoc(
                            collection(
                                db,
                                "patients"
                            ),
                            {

                                name:
                                    name,

                                cpf:
                                    cpf,

                                birthDate:
                                    birthDate,

                                phone:
                                    phone,

                                email:
                                    email,

                                address:
                                    address,

                                doctorId:
                                    user.uid,

                                createdAt:
                                    serverTimestamp()

                            }
                        );


                    addPatientToTable({

                        id:
                            patientRef.id,

                        name:
                            name,

                        cpf:
                            cpf,

                        birthDate:
                            birthDate,

                        phone:
                            phone,

                        email:
                            email,

                        address:
                            address

                    });


                    updatePatientCounter();


                    showNotification("Paciente cadastrado com sucesso!", "success");

                }


                patientForm.reset();

                resetPatientModal();


                if (patientModal) {

                    patientModal.classList.remove(
                        "active"
                    );

                }


            } catch (error) {

                console.error(
                    "Erro ao salvar paciente:",
                    error
                );


                showNotification("Não foi possível salvar o paciente. Verifique o console.", "error");


            } finally {

                if (savePatientButton) {

                    savePatientButton.disabled =
                        false;

                    savePatientButton.textContent =
                        "Salvar paciente";

                }

            }

        }
    );

}


// =========================================
// CARREGAR PACIENTES DO FIRESTORE
// =========================================

async function loadPatients(doctorId) {

    const tableBody =
        document.querySelector(
            "#patientsTableBody"
        );


    if (!tableBody) {

        return;

    }


    try {

        console.log(
            "Carregando pacientes do Firestore..."
        );


        tableBody.innerHTML = "";


        const patientsQuery =
            query(
                collection(
                    db,
                    "patients"
                ),
                where(
                    "doctorId",
                    "==",
                    doctorId
                )
            );


        const snapshot =
            await getDocs(
                patientsQuery
            );


        snapshot.forEach(
            function (documentSnapshot) {

                const patient =
                    documentSnapshot.data();


                addPatientToTable({

                    id:
                        documentSnapshot.id,

                    name:
                        patient.name || "",

                    cpf:
                        patient.cpf || "",

                    birthDate:
                        patient.birthDate || "",

                    phone:
                        patient.phone || "",

                    email:
                        patient.email || "",

                    address:
                        patient.address || ""

                });

            }
        );


        const counter =
            document.querySelector(
                "#totalPatients"
            );


        if (counter) {

            counter.textContent =
                snapshot.size;

        }


        // =========================================
        // CALCULAR PACIENTES ATIVOS E NOVOS DO MÊS
        // =========================================

        var now       = new Date();
        var thisYear  = now.getFullYear();
        var thisMonth = now.getMonth();
        var newThisMonth = 0;


        snapshot.forEach(function (docSnap) {

            var data = docSnap.data();

            if (data.createdAt && data.createdAt.toDate) {

                var created = data.createdAt.toDate();

                if (
                    created.getFullYear() === thisYear &&
                    created.getMonth()    === thisMonth
                ) {
                    newThisMonth++;
                }

            }

        });


        // Todos os cadastrados são considerados ativos
        // (não existe campo de inativação no sistema).

        var elActive = document.querySelector("#activePatients");
        var elNew    = document.querySelector("#newPatients");

        if (elActive) {
            elActive.textContent = snapshot.size;
        }

        if (elNew) {
            elNew.textContent = newThisMonth;
        }


        // Atualizar também o painel de visão geral.

        var quickTotal  = document.querySelector("#quickTotalPatients");
        var quickActive = document.querySelector("#quickActivePatients");
        var quickNew    = document.querySelector("#quickNewPatients");

        if (quickTotal)  { quickTotal.textContent  = snapshot.size; }
        if (quickActive) { quickActive.textContent = snapshot.size; }
        if (quickNew)    { quickNew.textContent    = newThisMonth; }


    } catch (error) {

        console.error(
            "Erro ao carregar pacientes:",
            error
        );


        showNotification("Não foi possível carregar os pacientes.", "error");

    }

}


// =========================================
// ADICIONAR PACIENTE NA TABELA
// =========================================

function addPatientToTable(patient) {

    const tableBody =
        document.querySelector(
            "#patientsTableBody"
        );


    if (!tableBody) {

        return;

    }


    const initials =
        getInitials(
            patient.name
        );


    const age =
        calculateAge(
            patient.birthDate
        );


    const row =
        document.createElement("tr");


    row.dataset.patientId =
        patient.id || "";


    row.innerHTML = `

        <td>

            <div class="table-patient">

                <div class="patient-photo">
                    ${initials}
                </div>

                <div>

                    <strong>
                        ${escapeHtml(patient.name)}
                    </strong>

                    <span>
                        ${age} anos
                    </span>

                </div>

            </div>

        </td>

        <td>
            ${escapeHtml(patient.cpf || "-")}
        </td>

        <td>
            ${escapeHtml(patient.phone || "-")}
        </td>

        <td>
            -
        </td>

        <td>

            <span class="patient-status active">
                Ativo
            </span>

        </td>

        <td>

            <div class="table-actions">

                <button
                    title="Visualizar"
                    class="table-button view-patient-button"
                    type="button"
                >
                    👁
                </button>

                <button
                    title="Editar"
                    class="table-button edit-patient-button"
                    type="button"
                >
                    ✎
                </button>

                <button
                    title="Excluir"
                    class="table-button delete-patient-button"
                    type="button"
                >
                    🗑
                </button>

            </div>

        </td>

    `;


    tableBody.appendChild(row);


    const editButton =
        row.querySelector(
            ".edit-patient-button"
        );


    if (editButton) {

        editButton.addEventListener(
            "click",
            function () {

                openEditPatient(
                    patient
                );

            }
        );

    }


    const viewButton =
        row.querySelector(
            ".view-patient-button"
        );


    if (viewButton) {

        viewButton.addEventListener(
            "click",
            function () {

                openViewPatient(
                    patient
                );

            }
        );

    }


    const deleteButton =
        row.querySelector(
            ".delete-patient-button"
        );


    if (deleteButton) {

        deleteButton.addEventListener(
            "click",
            async function () {

                await deletePatient(
                    patient.id,
                    patient.name,
                    row
                );

            }
        );

    }

}


// =========================================
// EXCLUIR PACIENTE
// =========================================

async function deletePatient(
    patientId,
    patientName,
    row
) {

    if (!patientId) {

        showNotification("Não foi possível identificar o paciente.", "error");

        return;

    }


    const confirmed =
        confirm(
            `Tem certeza que deseja excluir o paciente "${patientName}"?`
        );


    if (!confirmed) {

        return;

    }


    try {

        const patientReference =
            doc(
                db,
                "patients",
                patientId
            );


        await deleteDoc(
            patientReference
        );


        if (row) {

            row.remove();

        }


        updatePatientCounterAfterDelete();


        showNotification("Paciente excluído com sucesso!", "success");


    } catch (error) {

        console.error(
            "Erro ao excluir paciente:",
            error
        );


        showNotification("Não foi possível excluir o paciente. Verifique o console.", "error");

    }

}


// =========================================
// VISUALIZAR PACIENTE
// =========================================

function openViewPatient(patient) {

    createViewPatientModal();


    const viewModal =
        document.querySelector(
            "#viewPatientModal"
        );


    const viewName =
        document.querySelector(
            "#viewPatientName"
        );


    const viewInitials =
        document.querySelector(
            "#viewPatientInitials"
        );


    const viewCpf =
        document.querySelector(
            "#viewPatientCpf"
        );


    const viewBirthDate =
        document.querySelector(
            "#viewPatientBirthDate"
        );


    const viewAge =
        document.querySelector(
            "#viewPatientAge"
        );


    const viewPhone =
        document.querySelector(
            "#viewPatientPhone"
        );


    const viewEmail =
        document.querySelector(
            "#viewPatientEmail"
        );


    const viewAddress =
        document.querySelector(
            "#viewPatientAddress"
        );


    if (viewName) {

        viewName.textContent =
            patient.name || "-";

    }


    if (viewInitials) {

        viewInitials.textContent =
            getInitials(
                patient.name
            );

    }


    if (viewCpf) {

        viewCpf.textContent =
            patient.cpf || "-";

    }


    if (viewBirthDate) {

        viewBirthDate.textContent =
            formatBirthDate(
                patient.birthDate
            );

    }


    if (viewAge) {

        const age =
            calculateAge(
                patient.birthDate
            );


        viewAge.textContent =
            age === "-"
                ? "-"
                : `${age} anos`;

    }


    if (viewPhone) {

        viewPhone.textContent =
            patient.phone || "-";

    }


    if (viewEmail) {

        viewEmail.textContent =
            patient.email || "-";

    }


    if (viewAddress) {

        viewAddress.textContent =
            patient.address || "-";

    }


    if (viewModal) {

        viewModal.classList.add(
            "active"
        );

    }

}


// =========================================
// CRIAR MODAL DE VISUALIZAÇÃO
// =========================================

function createViewPatientModal() {

    if (
        document.querySelector(
            "#viewPatientModal"
        )
    ) {

        return;

    }


    const modal =
        document.createElement("div");


    modal.id =
        "viewPatientModal";


    modal.className =
        "view-patient-modal";


    modal.innerHTML = `

        <div class="view-patient-modal-content">

            <div class="view-patient-header">

                <div>

                    <h2>
                        Dados do paciente
                    </h2>

                    <p>
                        Informações cadastradas no sistema.
                    </p>

                </div>

                <button
                    type="button"
                    class="view-patient-close"
                    id="closeViewPatientModal"
                >
                    ×
                </button>

            </div>


            <div class="view-patient-profile">

                <div
                    class="view-patient-avatar"
                    id="viewPatientInitials"
                >
                    PA
                </div>


                <div>

                    <h3 id="viewPatientName">
                        -
                    </h3>

                    <span>
                        Paciente cadastrado
                    </span>

                </div>

            </div>


            <div class="view-patient-grid">

                <div class="view-patient-field">

                    <span>
                        CPF
                    </span>

                    <strong id="viewPatientCpf">
                        -
                    </strong>

                </div>


                <div class="view-patient-field">

                    <span>
                        Data de nascimento
                    </span>

                    <strong id="viewPatientBirthDate">
                        -
                    </strong>

                </div>


                <div class="view-patient-field">

                    <span>
                        Idade
                    </span>

                    <strong id="viewPatientAge">
                        -
                    </strong>

                </div>


                <div class="view-patient-field">

                    <span>
                        Telefone
                    </span>

                    <strong id="viewPatientPhone">
                        -
                    </strong>

                </div>


                <div class="view-patient-field">

                    <span>
                        E-mail
                    </span>

                    <strong id="viewPatientEmail">
                        -
                    </strong>

                </div>


                <div class="view-patient-field">

                    <span>
                        Endereço
                    </span>

                    <strong id="viewPatientAddress">
                        -
                    </strong>

                </div>

            </div>


            <div class="view-patient-footer">

                <button
                    type="button"
                    class="view-patient-close-button"
                    id="closeViewPatientButton"
                >
                    Fechar
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const style =
        document.createElement("style");


    style.id =
        "viewPatientModalStyles";


    style.textContent = `

        .view-patient-modal {
            display: none;
            position: fixed;
            inset: 0;
            z-index: 100000;
            background: rgba(15, 23, 42, 0.45);
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .view-patient-modal.active {
            display: flex !important;
        }

        .view-patient-modal-content {
            width: 100%;
            max-width: 680px;
            max-height: 90vh;
            overflow-y: auto;
            background: #ffffff;
            border-radius: 18px;
            padding: 28px;
            box-sizing: border-box;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
        }

        .view-patient-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 20px;
            margin-bottom: 25px;
        }

        .view-patient-header h2 {
            margin: 0 0 6px;
            font-size: 22px;
            color: #1f2937;
        }

        .view-patient-header p {
            margin: 0;
            font-size: 14px;
            color: #718096;
        }

        .view-patient-close {
            border: none;
            background: #f1f5f4;
            color: #64748b;
            width: 36px;
            height: 36px;
            border-radius: 10px;
            font-size: 24px;
            cursor: pointer;
        }

        .view-patient-close:hover {
            background: #e8f8f5;
            color: #168f82;
        }

        .view-patient-profile {
            display: flex;
            align-items: center;
            gap: 15px;
            padding: 18px;
            background: #f5f9f8;
            border-radius: 14px;
            margin-bottom: 22px;
        }

        .view-patient-avatar {
            width: 58px;
            height: 58px;
            border-radius: 50%;
            background: #e8f8f5;
            color: #168f82;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 18px;
        }

        .view-patient-profile h3 {
            margin: 0 0 4px;
            color: #1f2937;
            font-size: 19px;
        }

        .view-patient-profile span {
            color: #718096;
            font-size: 13px;
        }

        .view-patient-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        .view-patient-field {
            border: 1px solid #e8eeee;
            border-radius: 12px;
            padding: 15px;
            min-width: 0;
        }

        .view-patient-field span {
            display: block;
            font-size: 12px;
            color: #718096;
            margin-bottom: 6px;
        }

        .view-patient-field strong {
            display: block;
            font-size: 14px;
            color: #1f2937;
            word-break: break-word;
        }

        .view-patient-footer {
            display: flex;
            justify-content: flex-end;
            margin-top: 25px;
            padding-top: 20px;
            border-top: 1px solid #e8eeee;
        }

        .view-patient-close-button {
            border: 1px solid #dbe5e3;
            background: #ffffff;
            color: #4b5563;
            padding: 11px 20px;
            border-radius: 10px;
            cursor: pointer;
            font-weight: 600;
        }

        .view-patient-close-button:hover {
            background: #f5f9f8;
        }

        @media (max-width: 650px) {

            .view-patient-grid {
                grid-template-columns: 1fr;
            }

            .view-patient-modal-content {
                padding: 20px;
            }

        }

    `;


    document.head.appendChild(
        style
    );


    const closeButton =
        document.querySelector(
            "#closeViewPatientModal"
        );


    const closeFooterButton =
        document.querySelector(
            "#closeViewPatientButton"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeViewPatientModal
        );

    }


    if (closeFooterButton) {

        closeFooterButton.addEventListener(
            "click",
            closeViewPatientModal
        );

    }


    modal.addEventListener(
        "click",
        function (event) {

            if (
                event.target === modal
            ) {

                closeViewPatientModal();

            }

        }
    );

}


// =========================================
// FECHAR VISUALIZAÇÃO
// =========================================

function closeViewPatientModal() {

    const modal =
        document.querySelector(
            "#viewPatientModal"
        );


    if (modal) {

        modal.classList.remove(
            "active"
        );

    }

}


// =========================================
// ABRIR EDIÇÃO DE PACIENTE
// =========================================

function openEditPatient(patient) {

    editingPatientId =
        patient.id;


    const nameInput =
        document.querySelector(
            "#patientName"
        );


    const cpfInput =
        document.querySelector(
            "#patientCpf"
        );


    const birthDateInput =
        document.querySelector(
            "#patientBirthDate"
        );


    const phoneInput =
        document.querySelector(
            "#patientPhone"
        );


    const emailInput =
        document.querySelector(
            "#patientEmail"
        );


    const addressInput =
        document.querySelector(
            "#patientAddress"
        );


    if (nameInput) {

        nameInput.value =
            patient.name || "";

    }


    if (cpfInput) {

        cpfInput.value =
            patient.cpf || "";

    }


    if (birthDateInput) {

        birthDateInput.value =
            patient.birthDate || "";

    }


    if (phoneInput) {

        phoneInput.value =
            patient.phone || "";

    }


    if (emailInput) {

        emailInput.value =
            patient.email || "";

    }


    if (addressInput) {

        addressInput.value =
            patient.address || "";

    }


    if (patientModalTitle) {

        patientModalTitle.textContent =
            "Editar paciente";

    }


    if (patientModalDescription) {

        patientModalDescription.textContent =
            "Altere os dados do paciente.";

    }


    if (savePatientButton) {

        savePatientButton.textContent =
            "Salvar alterações";

    }


    if (patientModal) {

        patientModal.classList.add(
            "active"
        );

    }

}


// =========================================
// ATUALIZAR LINHA
// =========================================

function updatePatientRow(patient) {

    const row =
        document.querySelector(
            `tr[data-patient-id="${patient.id}"]`
        );


    if (!row) {

        return;

    }


    const initials =
        getInitials(
            patient.name
        );


    const age =
        calculateAge(
            patient.birthDate
        );


    const patientPhoto =
        row.querySelector(
            ".patient-photo"
        );


    const patientName =
        row.querySelector(
            ".table-patient strong"
        );


    const patientAge =
        row.querySelector(
            ".table-patient span"
        );


    const cells =
        row.querySelectorAll(
            "td"
        );


    if (patientPhoto) {

        patientPhoto.textContent =
            initials;

    }


    if (patientName) {

        patientName.textContent =
            patient.name;

    }


    if (patientAge) {

        patientAge.textContent =
            `${age} anos`;

    }


    if (cells[1]) {

        cells[1].textContent =
            patient.cpf || "-";

    }


    if (cells[2]) {

        cells[2].textContent =
            patient.phone || "-";

    }


    const editButton =
        row.querySelector(
            ".edit-patient-button"
        );


    const viewButton =
        row.querySelector(
            ".view-patient-button"
        );


    const deleteButton =
        row.querySelector(
            ".delete-patient-button"
        );


    if (editButton) {

        editButton.onclick =
            function () {

                openEditPatient(
                    patient
                );

            };

    }


    if (viewButton) {

        viewButton.onclick =
            function () {

                openViewPatient(
                    patient
                );

            };

    }


    if (deleteButton) {

        deleteButton.onclick =
            async function () {

                await deletePatient(
                    patient.id,
                    patient.name,
                    row
                );

            };

    }

}


// =========================================
// RESETAR MODAL
// =========================================

function resetPatientModal() {

    editingPatientId = null;


    if (patientModalTitle) {

        patientModalTitle.textContent =
            "Novo paciente";

    }


    if (patientModalDescription) {

        patientModalDescription.textContent =
            "Cadastre os dados do paciente.";

    }


    if (savePatientButton) {

        savePatientButton.textContent =
            "Salvar paciente";

    }

}


// =========================================
// PEGAR INICIAIS
// =========================================

function getInitials(name) {

    if (!name) {

        return "PA";

    }


    const parts =
        name
            .trim()
            .split(/\s+/)
            .filter(Boolean);


    if (parts.length === 1) {

        return parts[0]
            .substring(0, 2)
            .toUpperCase();

    }


    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();

}


// =========================================
// CALCULAR IDADE
// =========================================

function calculateAge(dateString) {

    if (!dateString) {

        return "-";

    }


    const birth =
        new Date(dateString);


    const today =
        new Date();


    let age =
        today.getFullYear() -
        birth.getFullYear();


    const month =
        today.getMonth() -
        birth.getMonth();


    if (
        month < 0 ||
        (
            month === 0 &&
            today.getDate() < birth.getDate()
        )
    ) {

        age--;

    }


    return age;

}


// =========================================
// FORMATAR DATA DE NASCIMENTO
// =========================================

function formatBirthDate(dateString) {

    if (!dateString) {

        return "-";

    }


    const parts =
        dateString.split("-");


    if (parts.length !== 3) {

        return dateString;

    }


    return (
        parts[2] +
        "/" +
        parts[1] +
        "/" +
        parts[0]
    );

}


// =========================================
// CONTADOR DE PACIENTES
// =========================================

function updatePatientCounter() {

    const counter =
        document.querySelector(
            "#totalPatients"
        );


    if (!counter) {

        return;

    }


    const current =
        parseInt(
            counter.textContent
        ) || 0;


    counter.textContent =
        current + 1;

}


// =========================================
// DIMINUIR CONTADOR
// =========================================

function updatePatientCounterAfterDelete() {

    const counter =
        document.querySelector(
            "#totalPatients"
        );


    if (!counter) {

        return;

    }


    const current =
        parseInt(
            counter.textContent
        ) || 0;


    if (current > 0) {

        counter.textContent =
            current - 1;

    }

}


// =========================================
// PESQUISA DE PACIENTES
// =========================================

const patientSearch =
    document.querySelector(
        "#patientSearch"
    );


if (patientSearch) {

    patientSearch.addEventListener(
        "input",
        function () {

            const search =
                this.value
                    .toLowerCase()
                    .trim();


            const rows =
                document.querySelectorAll(
                    "#patientsTableBody tr"
                );


            rows.forEach(
                function (row) {

                    const text =
                        row.textContent
                            .toLowerCase();


                    row.style.display =
                        text.includes(search)
                            ? ""
                            : "none";

                }
            );

        }
    );

}


// =========================================
// PESQUISA DA TOPBAR
// =========================================

const topSearch =
    document.querySelector(
        "#topSearch"
    );


if (topSearch) {

    topSearch.addEventListener(
        "input",
        function () {

            const search =
                this.value
                    .toLowerCase()
                    .trim();


            const rows =
                document.querySelectorAll(
                    "#patientsTableBody tr"
                );


            rows.forEach(
                function (row) {

                    const text =
                        row.textContent
                            .toLowerCase();


                    row.style.display =
                        text.includes(search)
                            ? ""
                            : "none";

                }
            );

        }
    );

}


// =========================================
// PRONTUÁRIO
// =========================================
//
// O prontuário possui seu próprio arquivo:
//
// ../JS/prontuario.js
//
// Não adicionamos eventos de prontuário
// aqui para evitar que dois arquivos
// controlem os mesmos botões.
//

// =========================================
// PERFIL
// =========================================

const saveProfileButton =
    document.querySelector(
        "#saveProfileButton"
    );

const changePasswordButton =
    document.querySelector(
        "#changePasswordButton"
    );


if (saveProfileButton) {

    saveProfileButton.addEventListener(
        "click",
        function () {

            showNotification("Alterações salvas com sucesso! (Demonstração)", "success");

        }
    );

}


if (changePasswordButton) {

    changePasswordButton.addEventListener(
        "click",
        function () {

            showNotification("A alteração de senha será implementada junto com o Firebase Authentication.", "info");

        }
    );

}


// =========================================
// BOTÃO SAIR
// =========================================

const logoutButton =
    document.querySelector(
        "#logoutButton"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            try {

                await auth.signOut();

                window.location.href =
                    "login.html";

            } catch (error) {

                console.error(
                    "Erro ao sair:",
                    error
                );

                showNotification("Não foi possível sair da conta.", "error");

            }

        }

    );

}


// =========================================
// FUNÇÕES DA AGENDA
// =========================================

function getMonday(date) {

    const result =
        new Date(date);


    result.setHours(
        0,
        0,
        0,
        0
    );


    const day =
        result.getDay();


    const difference =
        day === 0
            ? -6
            : 1 - day;


    result.setDate(
        result.getDate() +
        difference
    );


    return result;

}


function getWeekDates(startDate) {

    const dates = [];


    for (
        let i = 0;
        i < 5;
        i++
    ) {

        dates.push(
            addDays(
                startDate,
                i
            )
        );

    }


    return dates;

}


function addDays(
    date,
    days
) {

    const result =
        new Date(date);


    result.setDate(
        result.getDate() +
        days
    );


    return result;

}


function formatDateForFirestore(date) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(
            2,
            "0"
        );


    const day =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    return `${year}-${month}-${day}`;

}


function formatDateForDisplay(
    dateString
) {

    if (!dateString) {

        return "-";

    }


    const parts =
        dateString.split("-");


    if (parts.length !== 3) {

        return dateString;

    }


    return `${parts[2]}/${parts[1]}/${parts[0]}`;

}


function getWeekdayShort(date) {

    const weekdays = [
        "DOM",
        "SEG",
        "TER",
        "QUA",
        "QUI",
        "SEX",
        "SÁB"
    ];


    return weekdays[
        date.getDay()
    ];

}


function formatMonthTitle(
    weekDates
) {

    if (!weekDates.length) {

        return "";

    }


    const firstDate =
        weekDates[0];


    const lastDate =
        weekDates[
            weekDates.length - 1
        ];


    const months = [
        "Janeiro",
        "Fevereiro",
        "Março",
        "Abril",
        "Maio",
        "Junho",
        "Julho",
        "Agosto",
        "Setembro",
        "Outubro",
        "Novembro",
        "Dezembro"
    ];


    if (
        firstDate.getMonth() ===
        lastDate.getMonth()
    ) {

        return `
            ${months[firstDate.getMonth()]}
            ${firstDate.getFullYear()}
        `.trim();

    }


    return `
        ${months[firstDate.getMonth()]}
        ${firstDate.getFullYear()}
        -
        ${months[lastDate.getMonth()]}
        ${lastDate.getFullYear()}
    `.trim();

}


function isSameDay(
    dateA,
    dateB
) {

    return (
        dateA.getFullYear() ===
        dateB.getFullYear() &&

        dateA.getMonth() ===
        dateB.getMonth() &&

        dateA.getDate() ===
        dateB.getDate()
    );

}


// =========================================
// PROTEGER TEXTO
// =========================================

function escapeHtml(text) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text ?? "";


    return div.innerHTML;

}