import {
    getAuth,
    onAuthStateChanged,
    updateProfile,
    updateEmail,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";


import {
    doc,
    getDoc,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


import {
    app,
    db
} from "./firebase.js";


const auth = getAuth(app);



// =====================================================
// ELEMENTOS
// =====================================================

const profileAvatar =
    document.querySelector("#profileAvatar");

const profileDisplayName =
    document.querySelector("#profileDisplayName");

const profileDisplaySpecialty =
    document.querySelector("#profileDisplaySpecialty");

const displaySpecialty =
    document.querySelector("#displaySpecialty");

const displayCrm =
    document.querySelector("#displayCrm");

const displayEmail =
    document.querySelector("#displayEmail");

const displayPhone =
    document.querySelector("#displayPhone");


const profileName =
    document.querySelector("#profileName");

const profileSpecialty =
    document.querySelector("#profileSpecialty");

const profileCrm =
    document.querySelector("#profileCrm");

const profilePhone =
    document.querySelector("#profilePhone");

const profileEmail =
    document.querySelector("#profileEmail");

const profileAddress =
    document.querySelector("#profileAddress");


const saveProfileButton =
    document.querySelector("#saveProfileButton");

const cancelProfileButton =
    document.querySelector("#cancelProfileButton");

const profileMessage =
    document.querySelector("#profileMessage");


const sidebarDoctorAvatar =
    document.querySelector("#sidebarDoctorAvatar");

const sidebarDoctorName =
    document.querySelector("#sidebarDoctorName");


const topDoctorAvatar =
    document.querySelector("#topDoctorAvatar");

const topDoctorName =
    document.querySelector("#topDoctorName");


const securityEmail =
    document.querySelector("#securityEmail");


const changePasswordButton =
    document.querySelector("#changePasswordButton");



// =====================================================
// VARIÁVEIS
// =====================================================

let currentUser = null;

let originalProfile = {};



// =====================================================
// INICIAÇÃO
// =====================================================

onAuthStateChanged(
    auth,
    async function (user) {

        if (!user) {

            window.location.href = "login.html";

            return;

        }


        currentUser = user;


        console.log(
            "Usuário logado:",
            user.email
        );


        await loadProfile(user);

    }
);



// =====================================================
// CARREGAR PERFIL
// =====================================================

async function loadProfile(user) {

    try {

        const profileRef =
            doc(
                db,
                "doctors",
                user.uid
            );


        const profileSnapshot =
            await getDoc(profileRef);


        let profileData = {};


        if (profileSnapshot.exists()) {

            profileData =
                profileSnapshot.data();

        }



        /*
         * Se o usuário ainda não possui
         * um documento no Firestore,
         * usamos os dados do Firebase Authentication.
         */

        const name =
            profileData.name ||
            user.displayName ||
            getNameFromEmail(user.email);


        const specialty =
            profileData.specialty ||
            "";


        const crm =
            profileData.crm ||
            "";


        const phone =
            profileData.phone ||
            "";


        const email =
            profileData.email ||
            user.email ||
            "";


        const address =
            profileData.address ||
            "";



        originalProfile = {

            name: name,

            specialty: specialty,

            crm: crm,

            phone: phone,

            email: email,

            address: address

        };



        fillProfileFields(
            originalProfile
        );


        updateProfileVisuals(
            originalProfile
        );


        /*
         * Se ainda não existir no Firestore,
         * criamos o perfil automaticamente.
         */

        if (!profileSnapshot.exists()) {

            await setDoc(
                profileRef,
                {

                    doctorId: user.uid,

                    name: name,

                    specialty: specialty,

                    crm: crm,

                    phone: phone,

                    email: email,

                    address: address,

                    createdAt: serverTimestamp(),

                    updatedAt: serverTimestamp()

                },
                {
                    merge: true
                }
            );

            console.log(
                "Perfil criado no Firestore."
            );

        }

    }

    catch (error) {

        console.error(
            "Erro ao carregar perfil:",
            error
        );


        showMessage(
            "Não foi possível carregar os dados do perfil.",
            "error"
        );

    }

}



// =====================================================
// PREENCHER CAMPOS
// =====================================================

function fillProfileFields(profile) {

    profileName.value =
        profile.name || "";


    profileSpecialty.value =
        profile.specialty || "";


    profileCrm.value =
        profile.crm || "";


    profilePhone.value =
        profile.phone || "";


    profileEmail.value =
        profile.email || "";


    profileAddress.value =
        profile.address || "";

}



// =====================================================
// ATUALIZAR PARTE VISUAL
// =====================================================

function updateProfileVisuals(profile) {

    const name =
        profile.name || "Usuário";


    const initials =
        getInitials(name);


    /*
     * Avatar principal
     */

    if (profileAvatar) {

        profileAvatar.textContent =
            initials;

    }


    /*
     * Nome principal
     */

    if (profileDisplayName) {

        profileDisplayName.textContent =
            name;

    }


    /*
     * Especialidade abaixo do nome
     */

    if (profileDisplaySpecialty) {

        profileDisplaySpecialty.textContent =
            profile.specialty ||
            "Médico";

    }


    /*
     * Informações do card
     */

    if (displaySpecialty) {

        displaySpecialty.textContent =
            profile.specialty ||
            "-";

    }


    if (displayCrm) {

        displayCrm.textContent =
            profile.crm ||
            "-";

    }


    if (displayEmail) {

        displayEmail.textContent =
            profile.email ||
            "-";

    }


    if (displayPhone) {

        displayPhone.textContent =
            profile.phone ||
            "-";

    }


    /*
     * Sidebar
     */

    if (sidebarDoctorAvatar) {

        sidebarDoctorAvatar.textContent =
            initials;

    }


    if (sidebarDoctorName) {

        sidebarDoctorName.textContent =
            name;

    }


    /*
     * Topbar
     */

    if (topDoctorAvatar) {

        topDoctorAvatar.textContent =
            initials;

    }


    if (topDoctorName) {

        topDoctorName.textContent =
            name;

    }


    /*
     * Segurança
     */

    if (securityEmail) {

        securityEmail.textContent =
            profile.email ||
            "-";

    }

}



// =====================================================
// SALVAR PERFIL
// =====================================================

if (saveProfileButton) {

    saveProfileButton.addEventListener(
        "click",
        saveProfile
    );

}



async function saveProfile() {

    if (!currentUser) {

        showMessage(
            "Usuário não autenticado.",
            "error"
        );

        return;

    }



    const name =
        profileName.value.trim();


    const specialty =
        profileSpecialty.value.trim();


    const crm =
        profileCrm.value.trim();


    const phone =
        profilePhone.value.trim();


    const email =
        profileEmail.value.trim();


    const address =
        profileAddress.value.trim();



    // =================================================
    // VALIDAÇÕES
    // =================================================

    if (!name) {

        showMessage(
            "Digite o nome completo.",
            "error"
        );

        profileName.focus();

        return;

    }


    if (!email) {

        showMessage(
            "Digite um e-mail.",
            "error"
        );

        profileEmail.focus();

        return;

    }



    /*
     * Validação simples de e-mail
     */

    const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;


    if (!emailRegex.test(email)) {

        showMessage(
            "Digite um e-mail válido.",
            "error"
        );

        profileEmail.focus();

        return;

    }



    saveProfileButton.disabled =
        true;


    saveProfileButton.textContent =
        "Salvando...";



    try {

        // =============================================
        // DADOS DO PERFIL
        // =============================================

        const profileData = {

            doctorId:
                currentUser.uid,

            name:
                name,

            specialty:
                specialty,

            crm:
                crm,

            phone:
                phone,

            email:
                email,

            address:
                address,

            updatedAt:
                serverTimestamp()

        };



        // =============================================
        // FIRESTORE
        // =============================================

        const profileRef =
            doc(
                db,
                "doctors",
                currentUser.uid
            );


        await setDoc(
            profileRef,
            profileData,
            {
                merge: true
            }
        );



        // =============================================
        // FIREBASE AUTH - NOME
        // =============================================

        if (
            currentUser.displayName !== name
        ) {

            await updateProfile(
                currentUser,
                {
                    displayName: name
                }
            );

        }



        // =============================================
        // FIREBASE AUTH - E-MAIL
        // =============================================

        let emailUpdateWarning =
            false;


        if (
            currentUser.email !== email
        ) {

            try {

                await updateEmail(
                    currentUser,
                    email
                );

            }

            catch (emailError) {

                console.warn(
                    "Não foi possível alterar o e-mail do Authentication:",
                    emailError
                );


                /*
                 * Os dados continuam salvos
                 * no Firestore.
                 *
                 * O Firebase pode exigir
                 * uma nova autenticação para
                 * alterar o e-mail.
                 */

                if (
                    emailError.code ===
                    "auth/requires-recent-login"
                ) {

                    emailUpdateWarning =
                        true;

                }

            }

        }



        // =============================================
        // ATUALIZAR DADOS LOCAIS
        // =============================================

        originalProfile = {

            name: name,

            specialty: specialty,

            crm: crm,

            phone: phone,

            email: email,

            address: address

        };


        updateProfileVisuals(
            originalProfile
        );



        // =============================================
        // MENSAGEM
        // =============================================

        if (emailUpdateWarning) {

            showMessage(
                "Perfil salvo. Para alterar o e-mail de acesso do Firebase, será necessário fazer login novamente.",
                "warning"
            );

        }

        else {

            showMessage(
                "Perfil atualizado com sucesso!",
                "success"
            );

        }

    }

    catch (error) {

        console.error(
            "Erro ao salvar perfil:",
            error
        );


        showMessage(
            "Não foi possível salvar o perfil. Verifique o console.",
            "error"
        );

    }

    finally {

        saveProfileButton.disabled =
            false;


        saveProfileButton.textContent =
            "Salvar alterações";

    }

}



// =====================================================
// BOTÃO CANCELAR
// =====================================================

if (cancelProfileButton) {

    cancelProfileButton.addEventListener(
        "click",
        function () {

            fillProfileFields(
                originalProfile
            );


            updateProfileVisuals(
                originalProfile
            );


            showMessage(
                "Alterações descartadas.",
                "success"
            );

        }
    );

}



// =====================================================
// ALTERAR SENHA
// =====================================================

if (changePasswordButton) {

    changePasswordButton.addEventListener(
        "click",
        async function () {

            if (!currentUser) {

                return;

            }


            if (!currentUser.email) {

                showMessage(
                    "A conta não possui um e-mail cadastrado.",
                    "error"
                );

                return;

            }


            const confirmReset =
                confirm(
                    "Deseja receber um e-mail para redefinir sua senha?"
                );


            if (!confirmReset) {

                return;

            }


            try {

                await sendPasswordResetEmail(
                    auth,
                    currentUser.email
                );


                showMessage(
                    "E-mail para redefinição de senha enviado.",
                    "success"
                );

            }

            catch (error) {

                console.error(
                    "Erro ao enviar redefinição de senha:",
                    error
                );


                showMessage(
                    "Não foi possível enviar o e-mail de redefinição.",
                    "error"
                );

            }

        }
    );

}



// =====================================================
// MENSAGENS
// =====================================================

function showMessage(
    message,
    type
) {

    if (!profileMessage) {

        return;

    }


    profileMessage.textContent =
        message;


    profileMessage.style.display =
        "block";



    if (type === "success") {

        profileMessage.style.background =
            "#e8f8f5";

        profileMessage.style.color =
            "#147d70";

        profileMessage.style.border =
            "1px solid #b8e8df";

    }


    else if (type === "warning") {

        profileMessage.style.background =
            "#fff8e6";

        profileMessage.style.color =
            "#9a6700";

        profileMessage.style.border =
            "1px solid #f3df9d";

    }


    else {

        profileMessage.style.background =
            "#fff0f0";

        profileMessage.style.color =
            "#b42318";

        profileMessage.style.border =
            "1px solid #f0c4c4";

    }


    clearTimeout(
        showMessage.timeout
    );


    showMessage.timeout =
        setTimeout(
            function () {

                profileMessage.style.display =
                    "none";

            },
            5000
        );

}



// =====================================================
// INICIAIS
// =====================================================

function getInitials(name) {

    if (!name) {

        return "US";

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



// =====================================================
// NOME A PARTIR DO E-MAIL
// =====================================================

function getNameFromEmail(email) {

    if (!email) {

        return "Usuário";

    }


    const name =
        email.split("@")[0];


    return name
        .replace(/[._-]/g, " ")
        .replace(/\b\w/g, function (letter) {

            return letter.toUpperCase();

        });

}