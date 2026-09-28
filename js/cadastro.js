import {
    getAuth,
    createUserWithEmailAndPassword,
    updateProfile,
    signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import { app } from "./firebase.js";


const auth = getAuth(app);


const registerForm = document.getElementById("registerForm");

const nameInput = document.getElementById("registerName");
const emailInput = document.getElementById("registerEmail");
const passwordInput = document.getElementById("registerPassword");
const passwordConfirmInput = document.getElementById("registerPasswordConfirm");

const registerButton = document.getElementById("registerButton");
const registerMessage = document.getElementById("registerMessage");


function showMessage(message, type = "error") {

    registerMessage.textContent = message;

    registerMessage.className = "auth-message " + type;

}


registerForm.addEventListener("submit", async function (event) {

    event.preventDefault();


    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const passwordConfirm = passwordConfirmInput.value;


    if (!name) {

        showMessage("Digite seu nome completo.");

        return;

    }


    if (!email) {

        showMessage("Digite seu e-mail.");

        return;

    }


    if (password.length < 6) {

        showMessage("A senha precisa ter pelo menos 6 caracteres.");

        return;

    }


    if (password !== passwordConfirm) {

        showMessage("As senhas não são iguais.");

        return;

    }


    try {

        registerButton.disabled = true;

        registerButton.textContent = "Criando conta...";

        showMessage("");


        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user = userCredential.user;


        await updateProfile(user, {

            displayName: name

        });


        // O Firebase autentica o usuário automaticamente
        // depois da criação da conta.
        // Aqui fazemos o logout para que ele precise
        // entrar normalmente pela tela de login.

        await signOut(auth);


        showMessage(
            "Conta criada com sucesso! Redirecionando para o login...",
            "success"
        );


        setTimeout(function () {

            window.location.href = "login.html";

        }, 1500);


    } catch (error) {

        console.error("Erro ao criar conta:", error);


        switch (error.code) {

            case "auth/email-already-in-use":

                showMessage(
                    "Este e-mail já está cadastrado."
                );

                break;


            case "auth/invalid-email":

                showMessage(
                    "Digite um e-mail válido."
                );

                break;


            case "auth/weak-password":

                showMessage(
                    "A senha escolhida é muito fraca."
                );

                break;


            case "auth/network-request-failed":

                showMessage(
                    "Não foi possível conectar ao servidor. Verifique sua internet."
                );

                break;


            default:

                showMessage(
                    "Não foi possível criar a conta. Tente novamente."
                );

                break;

        }


        registerButton.disabled = false;

        registerButton.textContent = "Criar conta";

    }

});