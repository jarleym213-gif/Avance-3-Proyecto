import { supabase } from "./supabase.js";

const btnLogin = document.getElementById("btnLogin");
const txtCorreo = document.getElementById("correo");
const txtPassword = document.getElementById("password");

const login = async () => {

  const correo = txtCorreo.value.trim();
  const password = txtPassword.value.trim();

  if (!correo || !password) {
    Swal.fire("Ingrese correo y contraseña");
    return;
  }

  //LOGIN
  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: password
  });

  if (error) {
    console.error(error);
    Swal.fire("Correo o contraseña incorrectos");
    return;
  }

  //  email de spabase 
  const emailReal = data.user.email;

  //  OBTENER ROL
  const { data: usuarioDB, error: errorRol } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("correo", emailReal)
    .maybeSingle();

  if (errorRol) {
    console.error(errorRol);
    Swal.fire("Error obteniendo rol");
    return;
  }

  const rol = usuarioDB?.rol || "comprador";

  //  GUARDAR USUARIO COMPLETO
  const usuarioCompleto = {
    id: data.user.id,
    email: emailReal,
    rol: rol
  };

  localStorage.setItem("usuario", JSON.stringify(usuarioCompleto));

  Swal.fire("Bienvenido " + rol);

  window.location.href = "index.html";
};

// EVENTOS
btnLogin?.addEventListener("click", login);

txtPassword?.addEventListener("keypress", (e) => {
  if (e.key === "Enter") login();
});