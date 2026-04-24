import { currentUser, currentRole } from "./auth.js";


// INICIO
document.addEventListener("DOMContentLoaded", () => {
  inicializarFormulario();
});

// INICIALIZAR FORMULARIO
const inicializarFormulario = () => {
  const formulario = document.getElementById("formContacto");

  if (!formulario) return;

  formulario.addEventListener("submit", manejarEnvio);
};

// MANEJAR ENVÍO DEL FORMULARIO
const manejarEnvio = (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre")?.value.trim();
  const correo = document.getElementById("correo")?.value.trim();
  const asunto = document.getElementById("asunto")?.value.trim();
  const mensaje = document.getElementById("mensaje")?.value.trim();

  // VALIDACIÓN
  if (!nombre || !correo || !asunto || !mensaje) {
    Swal.fire("Complete todos los campos");
    return;
  }

  if (!correo.includes("@")) {
    Swal.fire("Correo inválido");
    return;
  }

  // LOG (simulación)
  console.log("Nombre:", nombre);
  console.log("Correo:", correo);
  console.log("Asunto:", asunto);
  console.log("Mensaje:", mensaje);

  // MENSAJE
  Swal.fire("Mensaje enviado correctamente");

  // LIMPIAR
  e.target.reset();
};