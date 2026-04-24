import { supabase } from "./supabase.js";

// REFERENCIAS DOM
const txtNombre = document.getElementById("txtNombre");
const txtCorreo = document.getElementById("txtCorreo");
const txtPassword = document.getElementById("txtPassword");
const txtConfirmPassword = document.getElementById("txtConfirmPassword");
const txtTelefono = document.getElementById("txtTelefono");
const btnRegistrar = document.getElementById("btnRegistrar");

const togglePassword = document.getElementById("togglePassword");
const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");

// EVENTOS
//btnRegistrar?.addEventListener("click", registrar);

// REGISTRAR USUARIO
const registrar = async () => {

  const usuario = obtenerDatosFormulario();

  if (!validarFormulario(usuario)) return;

  const existe = await validarUsuarioExistente(usuario.correo);
  if (existe) return;

  const userAuth = await crearAuth(usuario);
  if (!userAuth) return;

  await guardarUsuarioBD(userAuth, usuario);
  await guardarCliente(usuario, userAuth);

  Swal.fire({
  icon: "success",
  title: "Usuario creado con éxito",
  text: "Favor iniciar sesión",
  confirmButtonText: "Ir al login"
}).then(() => {
  window.location.href = "login.html";
});

};
btnRegistrar?.addEventListener("click", registrar);

// OBTENER DATOS DEL FORMULARIO
const obtenerDatosFormulario = () => ({
  nombre: txtNombre.value.trim(),
  correo: txtCorreo.value.trim(),
  password: txtPassword.value.trim(),
  confirmPassword: txtConfirmPassword.value.trim(),
  telefono: txtTelefono.value.trim()
});

// VALIDAR FORMULARIO
const validarFormulario = (u) => {

  if (!u.nombre || !u.correo || !u.password || !u.confirmPassword || !u.telefono) {
    Swal.fire("Complete todos los campos");
    return false;
  }

  if (!u.correo.includes("@")) {
    Swal.fire("Correo inválido");
    return false;
  }

  if (u.password.length < 6) {
    Swal.fire("La contraseña debe tener mínimo 6 caracteres");
    return false;
  }

  if (u.password !== u.confirmPassword) {
    Swal.fire("Las contraseñas no coinciden");
    return false;
  }

  return true;
};

// VALIDAR USUARIO EXISTENTE
const validarUsuarioExistente = async (correo) => {
  const { data } = await supabase
    .from("usuarios")
    .select("*")
    .eq("correo", correo)
    .maybeSingle();

  if (data) {
    Swal.fire("El correo ya está registrado");
    return true;
  }

  return false;
};

// CREAR AUTH
const crearAuth = async (usuario) => {
  const { data, error } = await supabase.auth.signUp({
    email: usuario.correo,
    password: usuario.password,
  });

  if (error || !data.user) {
    console.error(error);
    Swal.fire("Error creando usuario");
    return null;
  }

  return data.user;
};

// GUARDAR USUARIO EN BD
const guardarUsuarioBD = async (user, usuario) => {
  const { error } = await supabase.from("usuarios").insert([
    {
      id: user.id,
      correo: usuario.correo,
      rol: "comprador",
    },
  ]);

  if (error) {
    console.error(error);
    Swal.fire("Error guardando usuario");
  }
};

// GUARDAR CLIENTE
const guardarCliente = async (usuario, userAuth) => {
  const { error } = await supabase.from("clientes").insert([
    {
      nombre: usuario.nombre,
      correo: usuario.correo,
      telefono: usuario.telefono,
      usuario_id: userAuth.id
    },
  ]);
  

  if (error) {
    console.error(error);
    Swal.fire("Error guardando cliente");
  }
};

// TOGGLE CONTRASEÑA
togglePassword?.addEventListener("click", () => {
  txtPassword.type = txtPassword.type === "password" ? "text" : "password";
});

toggleConfirmPassword?.addEventListener("click", () => {
  txtConfirmPassword.type =
    txtConfirmPassword.type === "password" ? "text" : "password";
});