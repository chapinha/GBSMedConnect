import {
    getAuth,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { app } from "./firebase.js";


const auth = getAuth(app);


// ==========================================
// ELEMENTOS DA TELA
// ==========================================

const loginForm =
    document.querySelector("#loginForm");

const loginButton =
    document.querySelector("#loginButton");

const loginEmail =
    document.querySelector("#loginEmail");

const loginPassword =
    document.querySelector("#loginPassword");

const forgotPasswordButton =
    document.querySelector("#forgotPasswordButton");

const loginMessage =
    document.querySelector("#loginMessage");


// ==========================================
// MOSTRAR MENSAGEM
// ==========================================

function showMessage(message, type = "error") {

    if (!loginMessage) {
        return;
    }

    loginMessage.textContent = message;

    loginMessage.className =
        `login-message ${type}`;
}


// ==========================================
// MENSAGENS DE ERRO DO LOGIN
// ==========================================

function getLoginErrorMessage(error) {

    switch (error.code) {

        case "auth/invalid-email":
            return "Digite um e-mail válido.";

        case "auth/invalid-credential":
            return "E-mail ou senha incorretos.";

        case "auth/user-disabled":
            return "Este usuário está desativado.";

        case "auth/too-many-requests":
            return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";

        case "auth/network-request-failed":
            return "Verifique sua conexão com a internet.";

        default:
            return "Não foi possível realizar o login. Tente novamente.";
    }
}


// ==========================================
// MENSAGENS DE ERRO DA RECUPERAÇÃO
// ==========================================

function getPasswordResetErrorMessage(error) {

    switch (error.code) {

        case "auth/invalid-email":
            return "Digite um e-mail válido.";

        case "auth/user-not-found":
            return "Não foi possível enviar a recuperação para este e-mail.";

        case "auth/too-many-requests":
            return "Muitas solicitações. Aguarde alguns minutos e tente novamente.";

        case "auth/network-request-failed":
            return "Verifique sua conexão com a internet.";

        default:
            return "Não foi possível enviar a recuperação de senha. Tente novamente.";
    }
}


// ==========================================
// LOGIN
// ==========================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            const email =
                loginEmail.value.trim();

            const password =
                loginPassword.value;


            if (!email || !password) {

                showMessage(
                    "Preencha o e-mail e a senha."
                );

                return;
            }


            loginButton.disabled = true;

            loginButton.textContent =
                "Entrando...";


            try {

                console.log(
                    "Tentando fazer login:",
                    email
                );


                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );


                showMessage(
                    "Login realizado com sucesso!",
                    "success"
                );


                setTimeout(() => {

                    window.location.href =
                        "dashboard.html";

                }, 400);


            } catch (error) {

                console.error(
                    "Erro no login:",
                    error
                );


                showMessage(
                    getLoginErrorMessage(error)
                );


                loginButton.disabled = false;

                loginButton.textContent =
                    "Entrar";
            }

        }
    );
}


// ==========================================
// ESQUECI MINHA SENHA
// ==========================================

if (forgotPasswordButton) {

    forgotPasswordButton.addEventListener(
        "click",
        async function () {

            const email =
                loginEmail.value.trim();


            // Verifica se o usuário informou o e-mail

            if (!email) {

                showMessage(
                    "Digite seu e-mail primeiro para recuperar a senha."
                );

                loginEmail.focus();

                return;
            }


            // Verifica se o formato do e-mail é válido

            if (!loginEmail.checkValidity()) {

                showMessage(
                    "Digite um e-mail válido."
                );

                loginEmail.focus();

                return;
            }


            // Desabilita temporariamente o botão

            forgotPasswordButton.disabled = true;

            forgotPasswordButton.textContent =
                "Enviando...";


            try {

                console.log(
                    "Solicitando recuperação de senha para:",
                    email
                );


                await sendPasswordResetEmail(
                    auth,
                    email
                );


                showMessage(
                    "Se esse e-mail estiver cadastrado, você receberá as instruções para redefinir sua senha.",
                    "success"
                );


            } catch (error) {

                console.error(
                    "Erro ao recuperar senha:",
                    error
                );


                showMessage(
                    getPasswordResetErrorMessage(error)
                );


            } finally {

                forgotPasswordButton.disabled = false;

                forgotPasswordButton.textContent =
                    "Esqueci minha senha";

            }

        }
    );
}


// ==========================================
// VERIFICA SE JÁ ESTÁ LOGADO
// ==========================================
//
// Esta verificação serve SOMENTE para a tela
// de login.
//
// A página de cadastro NÃO deve ser redirecionada
// para o dashboard por causa de uma sessão existente.
//
// O cadastro possui seu próprio fluxo no
// cadastro.js.
//

if (loginForm) {

    onAuthStateChanged(
        auth,
        (user) => {

            if (!user) {
                return;
            }


            const currentPage =
                window.location.pathname;


            // Se o usuário já estiver logado
            // e tentar abrir o login novamente,
            // manda direto para o dashboard.

            if (
                currentPage.endsWith("/login.html") ||
                currentPage.endsWith("/login")
            ) {

                window.location.href =
                    "dashboard.html";
            }

        }
    );

}