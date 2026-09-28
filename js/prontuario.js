import {
    getAuth,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
    collection,
    getDocs,
    addDoc,
    query,
    where,
    serverTimestamp,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import { app, db } from "./firebase.js";

const auth = getAuth(app);


// ======================================================
// ELEMENTOS DA PÁGINA
// ======================================================

const patientSearch =
    document.querySelector("#recordPatientSearch");

const searchButton =
    document.querySelector("#searchRecordButton");

const newRecordButton =
    document.querySelector("#newRecordButton");

const saveRecordButton =
    document.querySelector("#saveRecordButton");

const clearRecordButton =
    document.querySelector("#clearRecordButton");


// ======================================================
// DADOS DO PACIENTE
// ======================================================

const patientName =
    document.querySelector("#recordPatientName");

const patientSince =
    document.querySelector("#recordPatientSince");

const patientCpf =
    document.querySelector("#recordPatientCpf");

const patientBirthDate =
    document.querySelector("#recordPatientBirthDate");

const patientPhone =
    document.querySelector("#recordPatientPhone");

const patientAvatar =
    document.querySelector("#recordPatientAvatar");


// ======================================================
// FORMULÁRIO
// ======================================================

const recordDate =
    document.querySelector("#recordDate");

const recordTime =
    document.querySelector("#recordTime");

const recordComplaint =
    document.querySelector("#recordComplaint");

const recordObservations =
    document.querySelector("#recordObservations");

const recordPrescription =
    document.querySelector("#recordPrescription");


// ======================================================
// HISTÓRICO
// ======================================================

const recordHistory =
    document.querySelector("#recordHistory");


// ======================================================
// VARIÁVEIS
// ======================================================

let currentUser = null;

let patients = [];

let selectedPatient = null;

let currentRecords = [];

let selectedRecord = null;


// ======================================================
// MODAL DE DETALHES
// ======================================================

let recordDetailsModal = null;

let detailsPatientName = null;
let detailsDate = null;
let detailsTime = null;
let detailsDoctor = null;
let detailsComplaint = null;
let detailsObservations = null;
let detailsPrescription = null;


// ======================================================
// FUNÇÕES AUXILIARES
// ======================================================

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
        parts[0].charAt(0) +
        parts[parts.length - 1].charAt(0)
    ).toUpperCase();
}


function formatDate(dateString) {

    if (!dateString) {
        return "-";
    }

    const parts =
        String(dateString).split("-");

    if (parts.length !== 3) {
        return dateString;
    }

    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}


function setToday() {

    const today = new Date();

    const year =
        today.getFullYear();

    const month =
        String(today.getMonth() + 1)
            .padStart(2, "0");

    const day =
        String(today.getDate())
            .padStart(2, "0");

    const hours =
        String(today.getHours())
            .padStart(2, "0");

    const minutes =
        String(today.getMinutes())
            .padStart(2, "0");

    if (recordDate) {

        recordDate.value =
            `${year}-${month}-${day}`;

    }

    if (recordTime) {

        recordTime.value =
            `${hours}:${minutes}`;

    }
}


function formatMonth(dateString) {

    if (!dateString) {
        return "---";
    }

    const parts =
        String(dateString).split("-");

    if (parts.length !== 3) {
        return "---";
    }

    const date =
        new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            1
        );

    return date
        .toLocaleDateString(
            "pt-BR",
            {
                month: "short"
            }
        )
        .replace(".", "")
        .toUpperCase();
}


// ======================================================
// NORMALIZAR TEXTO PARA PESQUISA
// ======================================================

function normalizeSearchText(text) {

    return String(text || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

}


// ======================================================
// CONFIGURAR RESULTADOS DA PESQUISA
// ======================================================

function createPatientResultsContainer() {

    let container =
        document.querySelector(
            "#patientSearchResults"
        );


    if (container) {
        return container;
    }


    if (!patientSearch) {
        return null;
    }


    container =
        document.createElement("div");


    container.id =
        "patientSearchResults";


    container.className =
        "patient-search-results";


    const searchContainer =
        patientSearch.parentElement;


    if (searchContainer) {

        searchContainer.style.position =
            "relative";


        searchContainer.appendChild(
            container
        );

    }


    return container;

}


// ======================================================
// ESCONDER RESULTADOS
// ======================================================

function hidePatientResults() {

    const container =
        document.querySelector(
            "#patientSearchResults"
        );


    if (!container) {
        return;
    }


    container.innerHTML = "";

    container.classList.remove(
        "active"
    );

}


// ======================================================
// MOSTRAR RESULTADOS
// ======================================================

function showPatientResults(results) {

    const container =
        createPatientResultsContainer();


    if (!container) {
        return;
    }


    container.innerHTML = "";


    if (!results || results.length === 0) {

        container.classList.remove(
            "active"
        );

        return;

    }


    results.forEach(
        (patient) => {

            const item =
                document.createElement("button");


            item.type =
                "button";


            item.className =
                "patient-search-result";


            const avatar =
                document.createElement("div");


            avatar.className =
                "patient-search-result-avatar";


            avatar.textContent =
                getInitials(
                    patient.name
                );


            const content =
                document.createElement("div");


            content.className =
                "patient-search-result-content";


            const name =
                document.createElement("strong");


            name.textContent =
                patient.name ||
                "Paciente";


            const details =
                document.createElement("span");


            const cpf =
                patient.cpf ||
                "CPF não informado";


            const birthDate =
                patient.birthDate
                    ? `Nascimento: ${formatDate(patient.birthDate)}`
                    : "Data de nascimento não informada";


            details.textContent =
                `${cpf} • ${birthDate}`;


            content.appendChild(
                name
            );


            content.appendChild(
                details
            );


            item.appendChild(
                avatar
            );


            item.appendChild(
                content
            );


            item.addEventListener(
                "click",
                async function () {

                    hidePatientResults();


                    await selectPatient(
                        patient
                    );

                }
            );


            container.appendChild(
                item
            );

        }
    );


    container.classList.add(
        "active"
    );

}


// ======================================================
// CONFIGURAR ESTILO DOS RESULTADOS
// ======================================================

function setupPatientSearchStyles() {

    if (
        document.querySelector(
            "#patientSearchStyles"
        )
    ) {

        return;

    }


    const style =
        document.createElement("style");


    style.id =
        "patientSearchStyles";


    style.textContent = `

        .record-search {
            position: relative;
        }

        .patient-search-results {
            position: absolute;
            top: calc(100% + 8px);
            left: 0;
            right: 0;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12);
            overflow: hidden;
            z-index: 1000;
            display: none;
            max-height: 320px;
            overflow-y: auto;
        }

        .patient-search-results.active {
            display: block;
        }

        .patient-search-result {
            width: 100%;
            border: 0;
            background: #ffffff;
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px 14px;
            text-align: left;
            cursor: pointer;
            border-bottom: 1px solid #f0f0f0;
            transition: background 0.2s ease;
        }

        .patient-search-result:last-child {
            border-bottom: 0;
        }

        .patient-search-result:hover {
            background: #f5f9ff;
        }

        .patient-search-result-avatar {
            width: 42px;
            height: 42px;
            min-width: 42px;
            border-radius: 50%;
            background: linear-gradient(135deg, #16a085, #3498db);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 13px;
            font-weight: 700;
        }

        .patient-search-result-content {
            min-width: 0;
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .patient-search-result-content strong {
            color: #1f2937;
            font-size: 14px;
            font-weight: 600;
        }

        .patient-search-result-content span {
            color: #6b7280;
            font-size: 12px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        @media (max-width: 600px) {

            .patient-search-results {
                max-height: 260px;
            }

            .patient-search-result {
                padding: 10px;
            }

            .patient-search-result-avatar {
                width: 38px;
                height: 38px;
                min-width: 38px;
            }

        }

    `;


    document.head.appendChild(
        style
    );

}


// ======================================================
// ESTILO DA EXCLUSÃO DO HISTÓRICO
// ======================================================

function setupRecordDeletionStyles() {

    if (
        document.querySelector(
            "#recordDeletionStyles"
        )
    ) {

        return;

    }


    const style =
        document.createElement("style");


    style.id =
        "recordDeletionStyles";


    style.textContent = `

        .history-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 12px;
        }

        .record-details-button,
        .record-select-button,
        .record-delete-button {
            border: 1px solid transparent;
            border-radius: 8px;
            padding: 9px 13px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition:
                background 0.2s ease,
                border-color 0.2s ease,
                color 0.2s ease,
                transform 0.2s ease;
        }

        .record-details-button:hover,
        .record-select-button:hover,
        .record-delete-button:hover {
            transform: translateY(-1px);
        }

        .record-delete-button {
            background: #fff5f5;
            color: #dc2626;
            border-color: #fecaca;
        }

        .record-delete-button:hover {
            background: #fee2e2;
            border-color: #fca5a5;
        }

        .record-delete-overlay {
            position: fixed;
            inset: 0;
            background: rgba(15, 23, 42, 0.52);
            backdrop-filter: blur(4px);
            -webkit-backdrop-filter: blur(4px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition:
                opacity 0.2s ease,
                visibility 0.2s ease;
        }

        .record-delete-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        .record-delete-modal {
            width: 100%;
            max-width: 460px;
            background: #ffffff;
            border-radius: 18px;
            box-shadow:
                0 24px 70px rgba(15, 23, 42, 0.24);
            padding: 28px;
            transform: translateY(12px) scale(0.98);
            transition: transform 0.2s ease;
        }

        .record-delete-overlay.active .record-delete-modal {
            transform: translateY(0) scale(1);
        }

        .record-delete-icon {
            width: 54px;
            height: 54px;
            border-radius: 50%;
            background: #fff1f2;
            color: #dc2626;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 18px;
        }

        .record-delete-icon svg {
            width: 26px;
            height: 26px;
        }

        .record-delete-title {
            margin: 0 0 9px;
            color: #1f2937;
            font-size: 21px;
            line-height: 1.3;
            font-weight: 700;
        }

        .record-delete-text {
            margin: 0;
            color: #64748b;
            font-size: 14px;
            line-height: 1.6;
        }

        .record-delete-info {
            margin-top: 18px;
            padding: 14px 15px;
            border-radius: 11px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
        }

        .record-delete-info strong {
            display: block;
            color: #334155;
            font-size: 14px;
            margin-bottom: 5px;
        }

        .record-delete-info span {
            display: block;
            color: #64748b;
            font-size: 13px;
        }

        .record-delete-warning {
            margin-top: 14px;
            padding: 11px 13px;
            border-radius: 9px;
            background: #fff7ed;
            border: 1px solid #fed7aa;
            color: #9a3412;
            font-size: 12px;
            line-height: 1.5;
        }

        .record-delete-actions {
            display: flex;
            justify-content: flex-end;
            gap: 10px;
            margin-top: 24px;
        }

        .record-delete-cancel,
        .record-delete-confirm {
            min-width: 125px;
            border-radius: 9px;
            padding: 11px 17px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition:
                background 0.2s ease,
                border-color 0.2s ease,
                color 0.2s ease,
                opacity 0.2s ease;
        }

        .record-delete-cancel {
            background: #ffffff;
            color: #475569;
            border: 1px solid #cbd5e1;
        }

        .record-delete-cancel:hover {
            background: #f8fafc;
        }

        .record-delete-confirm {
            background: #dc2626;
            color: #ffffff;
            border: 1px solid #dc2626;
        }

        .record-delete-confirm:hover {
            background: #b91c1c;
            border-color: #b91c1c;
        }

        .record-delete-cancel:disabled,
        .record-delete-confirm:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .record-action-notification {
            position: fixed;
            top: 22px;
            right: 22px;
            width: min(380px, calc(100vw - 44px));
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 13px;
            box-shadow:
                0 14px 38px rgba(15, 23, 42, 0.16);
            padding: 14px 16px;
            display: flex;
            align-items: flex-start;
            gap: 12px;
            z-index: 11000;
            opacity: 0;
            transform: translateY(-10px);
            pointer-events: none;
            transition:
                opacity 0.22s ease,
                transform 0.22s ease;
        }

        .record-action-notification.active {
            opacity: 1;
            transform: translateY(0);
        }

        .record-action-notification-icon {
            width: 34px;
            height: 34px;
            min-width: 34px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 17px;
            font-weight: 700;
        }

        .record-action-notification.success
        .record-action-notification-icon {
            background: #ecfdf5;
            color: #059669;
        }

        .record-action-notification.error
        .record-action-notification-icon {
            background: #fef2f2;
            color: #dc2626;
        }

        .record-action-notification-content {
            padding-top: 1px;
        }

        .record-action-notification-title {
            color: #1f2937;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 3px;
        }

        .record-action-notification-message {
            color: #64748b;
            font-size: 12px;
            line-height: 1.45;
        }

        @media (max-width: 600px) {

            .history-actions {
                flex-direction: column;
                align-items: stretch;
            }

            .record-details-button,
            .record-select-button,
            .record-delete-button {
                width: 100%;
            }

            .record-delete-modal {
                padding: 23px;
                border-radius: 15px;
            }

            .record-delete-actions {
                flex-direction: column-reverse;
            }

            .record-delete-cancel,
            .record-delete-confirm {
                width: 100%;
            }

            .record-action-notification {
                top: 14px;
                right: 14px;
                width: calc(100vw - 28px);
            }

        }

    `;


    document.head.appendChild(
        style
    );

}


// ======================================================
// NOTIFICAÇÃO PERSONALIZADA
// ======================================================

function showRecordNotification(
    message,
    type = "success"
) {

    let notification =
        document.querySelector(
            "#recordActionNotification"
        );


    if (!notification) {

        notification =
            document.createElement("div");

        notification.id =
            "recordActionNotification";

        notification.className =
            "record-action-notification";


        const icon =
            document.createElement("div");

        icon.className =
            "record-action-notification-icon";


        const content =
            document.createElement("div");

        content.className =
            "record-action-notification-content";


        const title =
            document.createElement("div");

        title.className =
            "record-action-notification-title";


        const messageElement =
            document.createElement("div");

        messageElement.className =
            "record-action-notification-message";


        content.appendChild(
            title
        );

        content.appendChild(
            messageElement
        );


        notification.appendChild(
            icon
        );

        notification.appendChild(
            content
        );


        document.body.appendChild(
            notification
        );

    }


    const icon =
        notification.querySelector(
            ".record-action-notification-icon"
        );

    const title =
        notification.querySelector(
            ".record-action-notification-title"
        );

    const messageElement =
        notification.querySelector(
            ".record-action-notification-message"
        );


    notification.classList.remove(
        "success",
        "error"
    );


    notification.classList.add(
        type
    );


    if (type === "error") {

        icon.textContent =
            "!";

        title.textContent =
            "Não foi possível concluir";

    } else {

        icon.textContent =
            "✓";

        title.textContent =
            "Tudo certo";

    }


    messageElement.textContent =
        message;


    notification.classList.add(
        "active"
    );


    clearTimeout(
        notification._hideTimer
    );


    notification._hideTimer =
        setTimeout(
            function () {

                notification.classList.remove(
                    "active"
                );

            },
            3500
        );

}


// ======================================================
// CRIAR MODAL DE CONFIRMAÇÃO DE EXCLUSÃO
// ======================================================

function createDeleteConfirmationModal() {

    let overlay =
        document.querySelector(
            "#recordDeleteOverlay"
        );


    if (overlay) {
        return overlay;
    }


    overlay =
        document.createElement("div");


    overlay.id =
        "recordDeleteOverlay";


    overlay.className =
        "record-delete-overlay";


    overlay.innerHTML = `

        <div
            class="record-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="recordDeleteTitle"
        >

            <div class="record-delete-icon">

                <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                >

                    <polyline points="3 6 5 6 21 6"></polyline>

                    <path d="M19 6l-1 14H6L5 6"></path>

                    <path d="M10 11v6"></path>

                    <path d="M14 11v6"></path>

                    <path d="M9 6V4h6v2"></path>

                </svg>

            </div>


            <h2
                id="recordDeleteTitle"
                class="record-delete-title"
            >
                Excluir atendimento?
            </h2>


            <p class="record-delete-text">

                Você está prestes a excluir este registro
                do histórico do paciente. Essa ação não
                poderá ser desfeita.

            </p>


            <div class="record-delete-info">

                <strong id="recordDeletePatient">
                    Paciente
                </strong>

                <span id="recordDeleteDate">
                    Atendimento
                </span>

            </div>


            <div class="record-delete-warning">

                ⚠️ O atendimento será removido
                permanentemente do prontuário.

            </div>


            <div class="record-delete-actions">

                <button
                    type="button"
                    class="record-delete-cancel"
                    id="recordDeleteCancel"
                >
                    Cancelar
                </button>


                <button
                    type="button"
                    class="record-delete-confirm"
                    id="recordDeleteConfirm"
                >
                    Excluir atendimento
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        overlay
    );


    const cancelButton =
        overlay.querySelector(
            "#recordDeleteCancel"
        );


    const confirmButton =
        overlay.querySelector(
            "#recordDeleteConfirm"
        );


    if (cancelButton) {

        cancelButton.addEventListener(
            "click",
            closeDeleteConfirmation
        );

    }


    if (confirmButton) {

        confirmButton.addEventListener(
            "click",
            async function () {

                const record =
                    overlay._recordToDelete;


                if (!record) {
                    return;
                }


                await deleteMedicalRecord(
                    record
                );

            }
        );

    }


    overlay.addEventListener(
        "click",
        function (event) {

            if (
                event.target === overlay
            ) {

                closeDeleteConfirmation();

            }

        }
    );


    return overlay;

}


// ======================================================
// ABRIR CONFIRMAÇÃO DE EXCLUSÃO
// ======================================================

function confirmDeleteMedicalRecord(
    record
) {

    if (!record) {
        return;
    }


    const overlay =
        createDeleteConfirmationModal();


    overlay._recordToDelete =
        record;


    const patientElement =
        overlay.querySelector(
            "#recordDeletePatient"
        );


    const dateElement =
        overlay.querySelector(
            "#recordDeleteDate"
        );


    const confirmButton =
        overlay.querySelector(
            "#recordDeleteConfirm"
        );


    if (patientElement) {

        patientElement.textContent =
            selectedPatient?.name ||
            record.patientName ||
            "Paciente";

    }


    if (dateElement) {

        const date =
            formatDate(
                record.date
            );


        const time =
            record.time ||
            "--:--";


        const type =
            record.type ||
            "Atendimento";


        dateElement.textContent =
            `${type} • ${date} às ${time}`;

    }


    if (confirmButton) {

        confirmButton.disabled =
            false;


        confirmButton.textContent =
            "Excluir atendimento";

    }


    overlay.classList.add(
        "active"
    );


    document.body.style.overflow =
        "hidden";

}


// ======================================================
// FECHAR CONFIRMAÇÃO DE EXCLUSÃO
// ======================================================

function closeDeleteConfirmation() {

    const overlay =
        document.querySelector(
            "#recordDeleteOverlay"
        );


    if (!overlay) {
        return;
    }


    overlay.classList.remove(
        "active"
    );


    overlay._recordToDelete =
        null;


    if (
        !recordDetailsModal?.classList.contains(
            "active"
        )
    ) {

        document.body.style.overflow =
            "";

    }

}


// ======================================================
// EXCLUIR ATENDIMENTO DO FIRESTORE
// ======================================================

async function deleteMedicalRecord(
    record
) {

    if (!record || !record.id) {

        showRecordNotification(
            "O atendimento selecionado não possui um identificador válido.",
            "error"
        );

        return;

    }


    if (!currentUser) {

        showRecordNotification(
            "Sua sessão não está autenticada.",
            "error"
        );

        return;

    }


    if (
        record.doctorId &&
        record.doctorId !== currentUser.uid
    ) {

        showRecordNotification(
            "Você não tem permissão para excluir este atendimento.",
            "error"
        );

        return;

    }


    const overlay =
        document.querySelector(
            "#recordDeleteOverlay"
        );


    const confirmButton =
        overlay?.querySelector(
            "#recordDeleteConfirm"
        );


    const cancelButton =
        overlay?.querySelector(
            "#recordDeleteCancel"
        );


    if (confirmButton) {

        confirmButton.disabled =
            true;

        confirmButton.textContent =
            "Excluindo...";

    }


    if (cancelButton) {

        cancelButton.disabled =
            true;

    }


    try {

        await deleteDoc(
            doc(
                db,
                "medicalRecords",
                record.id
            )
        );


        currentRecords =
            currentRecords.filter(
                (item) =>
                    item.id !== record.id
            );


        if (
            selectedRecord &&
            selectedRecord.id === record.id
        ) {

            selectedRecord =
                null;

        }


        closeDeleteConfirmation();


        if (
            recordDetailsModal?.classList.contains(
                "active"
            )
        ) {

            closeRecordDetails();

        }


        renderHistory(
            currentRecords
        );


        showRecordNotification(
            "O atendimento foi excluído do histórico com sucesso.",
            "success"
        );


    } catch (error) {

        console.error(
            "Erro ao excluir atendimento:",
            error
        );


        if (confirmButton) {

            confirmButton.disabled =
                false;

            confirmButton.textContent =
                "Excluir atendimento";

        }


        if (cancelButton) {

            cancelButton.disabled =
                false;

        }


        showRecordNotification(
            "Não foi possível excluir o atendimento. Tente novamente.",
            "error"
        );

    }

}


// ======================================================
// PESQUISA EM TEMPO REAL
// ======================================================

function searchPatientsLive() {

    if (!patientSearch) {
        return;
    }


    const search =
        normalizeSearchText(
            patientSearch.value
        );


    if (!search) {

        hidePatientResults();

        return;

    }


    const results =
        patients.filter(
            (patient) => {

                const name =
                    normalizeSearchText(
                        patient.name
                    );


                return name.includes(
                    search
                );

            }
        );


    showPatientResults(
        results
    );

}


// ======================================================
// CONFIGURAR MODAL
// ======================================================

function setupDetailsModal() {

    recordDetailsModal =
        document.querySelector("#recordDetailsModal");


    if (!recordDetailsModal) {

        console.error(
            "ERRO: #recordDetailsModal não encontrado no HTML."
        );

        return false;

    }


    detailsPatientName =
        recordDetailsModal.querySelector(
            "#detailsPatientName"
        );


    detailsDate =
        recordDetailsModal.querySelector(
            "#detailsDate"
        );


    detailsTime =
        recordDetailsModal.querySelector(
            "#detailsTime"
        );


    detailsDoctor =
        recordDetailsModal.querySelector(
            "#detailsDoctor"
        );


    detailsComplaint =
        recordDetailsModal.querySelector(
            "#detailsComplaint"
        );


    detailsObservations =
        recordDetailsModal.querySelector(
            "#detailsObservations"
        );


    detailsPrescription =
        recordDetailsModal.querySelector(
            "#detailsPrescription"
        );


    const closeButton =
        recordDetailsModal.querySelector(
            "#closeRecordDetailsButton"
        );


    const closeFooterButton =
        recordDetailsModal.querySelector(
            "#closeRecordDetailsButtonFooter"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            closeRecordDetails
        );

    }


    if (closeFooterButton) {

        closeFooterButton.addEventListener(
            "click",
            closeRecordDetails
        );

    }


    recordDetailsModal.addEventListener(
        "click",
        function (event) {

            if (
                event.target === recordDetailsModal
            ) {

                closeRecordDetails();

            }

        }
    );


    console.log(
        "Modal de detalhes configurado corretamente."
    );


    return true;

}


// ======================================================
// ABRIR DETALHES
// ======================================================

function openRecordDetails(record) {

    if (!record) {
        return;
    }


    if (!recordDetailsModal) {

        const modalFound =
            setupDetailsModal();


        if (!modalFound) {
            return;
        }

    }


    if (detailsPatientName) {

        detailsPatientName.textContent =
            selectedPatient?.name ||
            record.patientName ||
            "Paciente";

    }


    if (detailsDate) {

        detailsDate.textContent =
            formatDate(record.date);

    }


    if (detailsTime) {

        detailsTime.textContent =
            record.time ||
            "-";

    }


    if (detailsDoctor) {

        detailsDoctor.textContent =
            record.doctorName ||
            currentUser?.displayName ||
            currentUser?.email ||
            "Médico responsável";

    }


    if (detailsComplaint) {

        detailsComplaint.textContent =
            record.complaint ||
            "Nenhuma informação registrada.";

    }


    if (detailsObservations) {

        detailsObservations.textContent =
            record.observations ||
            "Nenhuma informação registrada.";

    }


    if (detailsPrescription) {

        detailsPrescription.textContent =
            record.prescription ||
            "Nenhuma prescrição registrada.";

    }


    recordDetailsModal.classList.add(
        "active"
    );


    document.body.style.overflow =
        "hidden";

}


// ======================================================
// FECHAR DETALHES
// ======================================================

function closeRecordDetails() {

    if (!recordDetailsModal) {
        return;
    }


    recordDetailsModal.classList.remove(
        "active"
    );


    document.body.style.overflow =
        "";

}


// ======================================================
// CARREGAR PACIENTES
// ======================================================

async function loadPatients() {

    if (!currentUser) {
        return;
    }


    try {

        const patientsQuery =
            query(
                collection(
                    db,
                    "patients"
                ),

                where(
                    "doctorId",
                    "==",
                    currentUser.uid
                )
            );


        const snapshot =
            await getDocs(
                patientsQuery
            );


        patients = [];


        snapshot.forEach(
            (document) => {

                patients.push({

                    id:
                        document.id,

                    ...document.data()

                });

            }
        );


        console.log(
            "Pacientes carregados:",
            patients
        );


    } catch (error) {

        console.error(
            "Erro ao carregar pacientes:",
            error
        );


        showRecordNotification(
            "Não foi possível carregar os pacientes.",
            "error"
        );

    }

}


// ======================================================
// PESQUISAR PACIENTE
// ======================================================

async function searchPatient() {

    const search =
        normalizeSearchText(
            patientSearch?.value
        );


    if (!search) {

        showRecordNotification(
            "Digite o nome do paciente.",
            "error"
        );

        return;

    }


    const results =
        patients.filter(
            (patient) => {

                const name =
                    normalizeSearchText(
                        patient.name
                    );


                return name.includes(
                    search
                );

            }
        );


    if (results.length === 0) {

        hidePatientResults();


        showRecordNotification(
            "Nenhum paciente encontrado.",
            "error"
        );

        return;

    }


    /*
     * Se houver somente um resultado,
     * selecionamos automaticamente.
     */

    if (results.length === 1) {

        hidePatientResults();


        await selectPatient(
            results[0]
        );


        return;

    }


    /*
     * Quando existem vários pacientes,
     * mostramos todos em uma lista visual.
     */

    showPatientResults(
        results
    );

}


// ======================================================
// SELECIONAR PACIENTE
// ======================================================

async function selectPatient(patient) {

    selectedPatient =
        patient;


    selectedRecord =
        null;


    if (patientName) {

        patientName.textContent =
            patient.name ||
            "Paciente";

    }


    if (patientAvatar) {

        patientAvatar.textContent =
            getInitials(
                patient.name
            );

    }


    if (patientCpf) {

        patientCpf.textContent =
            patient.cpf ||
            "-";

    }


    if (patientBirthDate) {

        patientBirthDate.textContent =
            formatDate(
                patient.birthDate
            );

    }


    if (patientPhone) {

        patientPhone.textContent =
            patient.phone ||
            "-";

    }


    if (patientSince) {

        if (
            patient.createdAt &&
            typeof patient.createdAt.toDate === "function"
        ) {

            patientSince.textContent =
                `Paciente desde ${
                    patient.createdAt
                        .toDate()
                        .toLocaleDateString(
                            "pt-BR"
                        )
                }`;

        } else {

            patientSince.textContent =
                "Paciente cadastrado no sistema";

        }

    }


    if (patientSearch) {

        patientSearch.value =
            patient.name || "";

    }


    hidePatientResults();


    clearForm();


    await loadPatientHistory(
        patient.id
    );


    await loadPatientAppointments(
        patient.id
    );

}


// ======================================================
// CARREGAR ATENDIMENTOS DO PACIENTE
// ======================================================

async function loadPatientAppointments(
    patientId
) {

    if (!currentUser) {
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
                    currentUser.uid
                ),

                where(
                    "patientId",
                    "==",
                    patientId
                )
            );


        const snapshot =
            await getDocs(
                appointmentsQuery
            );


        const appointments = [];


        snapshot.forEach(
            (document) => {

                appointments.push({

                    id:
                        document.id,

                    ...document.data()

                });

            }
        );


        appointments.sort(
            (a, b) => {

                const dateA =
                    `${a.date || ""} ${a.time || ""}`;

                const dateB =
                    `${b.date || ""} ${b.time || ""}`;

                return dateB.localeCompare(
                    dateA
                );

            }
        );


        renderAppointmentSelector(
            appointments
        );


    } catch (error) {

        console.error(
            "Erro ao carregar atendimentos do paciente:",
            error
        );

    }

}


// ======================================================
// CRIAR SELETOR DE ATENDIMENTO
// ======================================================

function renderAppointmentSelector(
    appointments
) {

    let selectorContainer =
        document.querySelector(
            "#recordAppointmentSelector"
        );


    /*
     * Caso o HTML ainda não possua o seletor,
     * ele será criado automaticamente.
     */

    if (!selectorContainer) {

        selectorContainer =
            document.createElement("section");


        selectorContainer.id =
            "recordAppointmentSelector";


        selectorContainer.className =
            "dashboard-card record-appointment-selector";


        const recordGrid =
            document.querySelector(
                ".record-grid"
            );


        if (recordGrid) {

            recordGrid.parentNode.insertBefore(
                selectorContainer,
                recordGrid
            );

        } else {

            return;

        }

    }


    selectorContainer.innerHTML = "";


    const title =
        document.createElement("h3");


    title.textContent =
        "Selecione o atendimento";


    const description =
        document.createElement("p");


    description.textContent =
        appointments.length > 0
            ? "Escolha o atendimento que deseja visualizar ou registrar."
            : "Este paciente ainda não possui atendimentos cadastrados.";


    selectorContainer.appendChild(
        title
    );


    selectorContainer.appendChild(
        description
    );


    if (appointments.length === 0) {

        const empty =
            document.createElement("div");


        empty.className =
            "record-appointment-empty";


        empty.textContent =
            "Nenhum atendimento encontrado.";


        selectorContainer.appendChild(
            empty
        );


        return;

    }


    const select =
        document.createElement("select");


    select.id =
        "recordAppointmentSelect";


    select.className =
        "record-appointment-select";


    const defaultOption =
        document.createElement("option");


    defaultOption.value =
        "";


    defaultOption.textContent =
        "Escolha um atendimento...";


    select.appendChild(
        defaultOption
    );


    appointments.forEach(
        (appointment) => {

            const option =
                document.createElement("option");


            option.value =
                appointment.id;


            const date =
                formatDate(
                    appointment.date
                );


            const time =
                appointment.time ||
                "--:--";


            const type =
                appointment.type ||
                "Consulta";


            const status =
                appointment.status ||
                "Agendada";


            option.textContent =
                `${date} • ${time} • ${type} • ${status}`;


            select.appendChild(
                option
            );

        }
    );


    selectorContainer.appendChild(
        select
    );


    const selectedMessage =
        document.createElement("div");


    selectedMessage.id =
        "selectedAppointmentMessage";


    selectedMessage.className =
        "selected-appointment-message";


    selectedMessage.textContent =
        "Nenhum atendimento selecionado.";


    selectorContainer.appendChild(
        selectedMessage
    );


    select.addEventListener(
        "change",
        function () {

            const appointmentId =
                select.value;


            if (!appointmentId) {

                selectedRecord =
                    null;


                selectedMessage.textContent =
                    "Nenhum atendimento selecionado.";


                return;

            }


            const appointment =
                appointments.find(
                    (item) =>
                        item.id ===
                        appointmentId
                );


            if (!appointment) {
                return;
            }


            selectAppointment(
                appointment
            );

        }
    );

}


// ======================================================
// SELECIONAR ATENDIMENTO
// ======================================================

function selectAppointment(
    appointment
) {

    selectedRecord =
        appointment;


    const selectedMessage =
        document.querySelector(
            "#selectedAppointmentMessage"
        );


    if (selectedMessage) {

        selectedMessage.textContent =
            `Atendimento selecionado: ${
                formatDate(
                    appointment.date
                )
            } às ${
                appointment.time ||
                "--:--"
            } — ${
                appointment.type ||
                "Consulta"
            }`;

    }


    /*
     * O atendimento selecionado passa
     * a preencher o formulário.
     */

    if (recordDate) {

        recordDate.value =
            appointment.date || "";

    }


    if (recordTime) {

        recordTime.value =
            appointment.time || "";

    }


    /*
     * Procura também um prontuário
     * correspondente a esse atendimento.
     */

    const medicalRecord =
        currentRecords.find(
            (record) =>
                record.appointmentId ===
                appointment.id
        );


    if (medicalRecord) {

        fillRecordForm(
            medicalRecord
        );

    } else {

        /*
         * Se o atendimento ainda não possui
         * prontuário, limpa os campos clínicos
         * mas mantém data e horário.
         */

        if (recordComplaint) {

            recordComplaint.value =
                "";

        }


        if (recordObservations) {

            recordObservations.value =
                "";

        }


        if (recordPrescription) {

            recordPrescription.value =
                "";

        }

    }


    /*
     * Faz o histórico destacar o atendimento
     * escolhido.
     */

    highlightSelectedRecord(
        medicalRecord?.id
    );

}


// ======================================================
// PREENCHER FORMULÁRIO
// ======================================================

function fillRecordForm(record) {

    if (!record) {
        return;
    }


    if (recordDate) {

        recordDate.value =
            record.date || "";

    }


    if (recordTime) {

        recordTime.value =
            record.time || "";

    }


    if (recordComplaint) {

        recordComplaint.value =
            record.complaint || "";

    }


    if (recordObservations) {

        recordObservations.value =
            record.observations || "";

    }


    if (recordPrescription) {

        recordPrescription.value =
            record.prescription || "";

    }

}


// ======================================================
// DESTACAR ATENDIMENTO
// ======================================================

function highlightSelectedRecord(
    recordId
) {

    const items =
        document.querySelectorAll(
            ".history-item"
        );


    items.forEach(
        (item) => {

            item.classList.remove(
                "selected-record"
            );

        }
    );


    if (!recordId) {
        return;
    }


    const selectedItem =
        document.querySelector(
            `[data-record-id="${recordId}"]`
        );


    if (selectedItem) {

        selectedItem.classList.add(
            "selected-record"
        );

    }

}


// ======================================================
// CARREGAR HISTÓRICO
// ======================================================

async function loadPatientHistory(
    patientId
) {

    if (
        !recordHistory ||
        !currentUser
    ) {

        return;
    }


    recordHistory.innerHTML = `
        <div class="empty-state">
            <p>Carregando histórico...</p>
        </div>
    `;


    try {

        const recordsQuery =
            query(
                collection(
                    db,
                    "medicalRecords"
                ),

                where(
                    "doctorId",
                    "==",
                    currentUser.uid
                ),

                where(
                    "patientId",
                    "==",
                    patientId
                )
            );


        const snapshot =
            await getDocs(
                recordsQuery
            );


        currentRecords = [];


        snapshot.forEach(
            (document) => {

                currentRecords.push({

                    id:
                        document.id,

                    ...document.data()

                });

            }
        );


        currentRecords.sort(
            (a, b) => {

                const dateA =
                    `${a.date || ""} ${a.time || ""}`;

                const dateB =
                    `${b.date || ""} ${b.time || ""}`;

                return dateB.localeCompare(
                    dateA
                );

            }
        );


        renderHistory(
            currentRecords
        );


    } catch (error) {

        console.error(
            "Erro ao carregar histórico:",
            error
        );


        currentRecords = [];


        recordHistory.innerHTML = `
            <div class="empty-state">
                <p>
                    Não foi possível carregar o histórico.
                </p>
            </div>
        `;

    }

}


// ======================================================
// RENDERIZAR HISTÓRICO
// ======================================================

function renderHistory(records) {

    if (!recordHistory) {
        return;
    }


    if (records.length === 0) {

        recordHistory.innerHTML = `
            <div class="empty-state">
                <p>
                    Nenhum atendimento registrado para este paciente.
                </p>
            </div>
        `;

        return;
    }


    recordHistory.innerHTML = "";


    records.forEach(
        (record) => {

            const item =
                document.createElement("div");


            item.className =
                "history-item";


            item.dataset.recordId =
                record.id;


            const day =
                record.date
                    ? String(
                        record.date
                    ).split("-")[2]
                    : "--";


            const month =
                formatMonth(
                    record.date
                );


            const description =
                record.complaint ||
                record.observations ||
                "Atendimento registrado.";


            item.innerHTML = `

                <div class="history-date">

                    <strong>
                        ${day}
                    </strong>

                    <span>
                        ${month}
                    </span>

                </div>


                <div class="history-content">

                    <strong>
                        ${
                            record.type ||
                            "Atendimento"
                        }
                    </strong>

                    <span>
                        ${formatDate(record.date)}
                        ${
                            record.time
                                ? " · " + record.time
                                : ""
                        }
                    </span>

                    <p>
                        ${description}
                    </p>

                    <div class="history-actions">

                        <button
                            type="button"
                            class="record-details-button"
                        >
                            Ver detalhes
                        </button>

                        <button
                            type="button"
                            class="record-select-button"
                        >
                            Selecionar atendimento
                        </button>

                        <button
                            type="button"
                            class="record-delete-button"
                        >
                            Excluir atendimento
                        </button>

                    </div>

                </div>

            `;


            const detailsButton =
                item.querySelector(
                    ".record-details-button"
                );


            if (detailsButton) {

                detailsButton.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        event.stopPropagation();

                        openRecordDetails(
                            record
                        );

                    }
                );

            }


            const selectButton =
                item.querySelector(
                    ".record-select-button"
                );


            if (selectButton) {

                selectButton.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        event.stopPropagation();

                        selectMedicalRecord(
                            record
                        );

                    }
                );

            }


            const deleteButton =
                item.querySelector(
                    ".record-delete-button"
                );


            if (deleteButton) {

                deleteButton.addEventListener(
                    "click",
                    function (event) {

                        event.preventDefault();

                        event.stopPropagation();

                        confirmDeleteMedicalRecord(
                            record
                        );

                    }
                );

            }


            recordHistory.appendChild(
                item
            );

        }
    );

}


// ======================================================
// SELECIONAR PRONTUÁRIO PELO HISTÓRICO
// ======================================================

function selectMedicalRecord(
    record
) {

    selectedRecord =
        record;


    fillRecordForm(
        record
    );


    highlightSelectedRecord(
        record.id
    );


    const appointmentSelect =
        document.querySelector(
            "#recordAppointmentSelect"
        );


    if (
        appointmentSelect &&
        record.appointmentId
    ) {

        appointmentSelect.value =
            record.appointmentId;

    }


    /*
     * O usuário selecionou diretamente
     * um prontuário existente.
     */

    const selectedMessage =
        document.querySelector(
            "#selectedAppointmentMessage"
        );


    if (selectedMessage) {

        selectedMessage.textContent =
            `Atendimento selecionado: ${
                formatDate(record.date)
            } às ${
                record.time ||
                "--:--"
            }`;

    }

}


// ======================================================
// SALVAR ATENDIMENTO
// ======================================================

async function saveRecord() {

    if (!currentUser) {

        showRecordNotification(
            "Usuário não autenticado.",
            "error"
        );

        return;

    }


    if (!selectedPatient) {

        showRecordNotification(
            "Selecione um paciente antes de salvar.",
            "error"
        );

        return;

    }


    const date =
        recordDate?.value;


    const time =
        recordTime?.value;


    const complaint =
        recordComplaint?.value
            .trim();


    const observations =
        recordObservations?.value
            .trim();


    const prescription =
        recordPrescription?.value
            .trim();


    if (!date) {

        showRecordNotification(
            "Informe a data do atendimento.",
            "error"
        );

        return;

    }


    /*
     * Se o usuário escolheu um atendimento,
     * salvamos a relação entre o prontuário
     * e aquele atendimento.
     */

    const appointmentId =
        selectedRecord?.appointmentId ||
        selectedRecord?.id ||
        null;


    try {

        saveRecordButton.disabled =
            true;


        saveRecordButton.textContent =
            "Salvando...";


        await addDoc(
            collection(
                db,
                "medicalRecords"
            ),
            {

                patientId:
                    selectedPatient.id,

                patientName:
                    selectedPatient.name || "",

                doctorId:
                    currentUser.uid,

                doctorName:
                    currentUser.displayName ||
                    currentUser.email ||
                    "Médico",

                appointmentId:
                    appointmentId,

                date:
                    date,

                time:
                    time || "",

                complaint:
                    complaint || "",

                observations:
                    observations || "",

                prescription:
                    prescription || "",

                createdAt:
                    serverTimestamp()

            }
        );


        /*
         * Em vez do alert do Windows,
         * usamos a notificação visual do sistema.
         */

        showRecordNotification(
            "O atendimento foi salvo com sucesso no histórico do paciente.",
            "success"
        );


        clearForm();


        await loadPatientHistory(
            selectedPatient.id
        );


        await loadPatientAppointments(
            selectedPatient.id
        );


    } catch (error) {

        console.error(
            "Erro ao salvar atendimento:",
            error
        );


        showRecordNotification(
            "Não foi possível salvar o atendimento. Tente novamente.",
            "error"
        );


    } finally {

        saveRecordButton.disabled =
            false;


        saveRecordButton.textContent =
            "Salvar atendimento";

    }

}


// ======================================================
// LIMPAR FORMULÁRIO
// ======================================================

function clearForm() {

    if (recordComplaint) {

        recordComplaint.value =
            "";

    }


    if (recordObservations) {

        recordObservations.value =
            "";

    }


    if (recordPrescription) {

        recordPrescription.value =
            "";

    }


    /*
     * Só coloca a data atual quando
     * nenhum atendimento está selecionado.
     */

    if (!selectedRecord) {

        setToday();

    }

}


// ======================================================
// NOVO ATENDIMENTO
// ======================================================

function newRecord() {

    if (!selectedPatient) {

        showRecordNotification(
            "Primeiro selecione um paciente.",
            "error"
        );

        return;

    }


    selectedRecord =
        null;


    clearForm();


    const appointmentSelect =
        document.querySelector(
            "#recordAppointmentSelect"
        );


    if (appointmentSelect) {

        appointmentSelect.value =
            "";

    }


    const selectedMessage =
        document.querySelector(
            "#selectedAppointmentMessage"
        );


    if (selectedMessage) {

        selectedMessage.textContent =
            "Nenhum atendimento selecionado.";

    }


    if (recordComplaint) {

        recordComplaint.focus();

    }

}


// ======================================================
// EVENTOS
// ======================================================

searchButton?.addEventListener(
    "click",
    searchPatient
);


patientSearch?.addEventListener(
    "input",
    searchPatientsLive
);


patientSearch?.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            event.preventDefault();

            searchPatient();

        }

    }
);


document.addEventListener(
    "click",
    function (event) {

        const resultsContainer =
            document.querySelector(
                "#patientSearchResults"
            );


        if (
            !resultsContainer ||
            !patientSearch
        ) {

            return;

        }


        if (
            !resultsContainer.contains(
                event.target
            ) &&
            event.target !== patientSearch
        ) {

            hidePatientResults();

        }

    }
);


saveRecordButton?.addEventListener(
    "click",
    saveRecord
);


clearRecordButton?.addEventListener(
    "click",
    clearForm
);


newRecordButton?.addEventListener(
    "click",
    newRecord
);


document.addEventListener(
    "keydown",
    (event) => {

        if (
            event.key === "Escape" &&
            recordDetailsModal?.classList.contains("active")
        ) {

            closeRecordDetails();

        }


        if (
            event.key === "Escape"
        ) {

            const deleteOverlay =
                document.querySelector(
                    "#recordDeleteOverlay"
                );


            if (
                deleteOverlay?.classList.contains(
                    "active"
                )
            ) {

                closeDeleteConfirmation();

            }

        }

    }
);


// ======================================================
// AUTENTICAÇÃO
// ======================================================

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "login.html";

            return;

        }


        currentUser =
            user;


        console.log(
            "Prontuário carregando para:",
            user.email
        );


        setupDetailsModal();

        setupPatientSearchStyles();

        setupRecordDeletionStyles();


        await loadPatients();


        setToday();

    }
);